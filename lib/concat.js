'use strict';

const cheerio = require('cheerio');
const Promise = require('bluebird');
const fs = require('fs');

const htmls = {};

function getLocalScripts(log, routeList, route, options, path) {
    const autoPattern = options.auto_pattern || options.pattern;

    return Promise.all(routeList.filter(path => path.endsWith('.html')).map(path => {
        // 1. get the htmls that has local scripts
        return new Promise((resolve, reject) => {
            const html = route.get(path);
            let htmlTxt = '';
            html.on('data', (chunk) => (htmlTxt += chunk));
            html.on('end', () => {
                const $ = cheerio.load(htmlTxt, { decodeEntities: false });
                const $scripts = {};
                const srcs = [];
                $('script[src]').each((idx, ele) => {
                    const $script = $(ele);
                    let src = $script.attr('src');
                    if (src && src.length) {

                        // local script only
                        if (src.startsWith('//') || src.startsWith('http')) {
                            return;
                        }

                        // skip if the url match pattern in skip option
                        if (autoPattern && autoPattern.skip) {
                            const skipPatterns = Array.isArray(autoPattern.skip) ? autoPattern.skip : [autoPattern.skip];
                            const shouldSkip = skipPatterns.some(skipPattern => {
                                try {
                                    return src.match(skipPattern) || route.format(src).match(skipPattern);
                                } catch (e) {
                                    return src === skipPattern || route.format(src) === skipPattern;
                                }
                            });
                            if (shouldSkip) return;
                        }

                        // keep bundle_paths
                        if (src.endsWith(options.bundle_path.body_first)) return;
                        if (src.endsWith(options.bundle_path.body_last)) return;
                        
                        const originalSrc = src;
                        src = route.format(src);
                        // ignore and remove duplicated
                        if (srcs.indexOf(src) === -1) {
                            srcs.push(src);
                            $scripts[src] = $script;
                            $scripts[originalSrc] = $script;
                        } else {
                            $script.remove();
                        }
                    }
                });
                if (srcs.length) {
                    htmls[path] = { path, $, srcs, $scripts };
                }
                resolve();
            });
        });
    }))
}

function extractCommonScripts(log, options, route, bundlePath, placement, downloads) {
    const htmlPaths = Object.keys(htmls);
    const scripts = [];

    // Get pattern config (backward compatibility)
    const autoPattern = options.auto_pattern || options.pattern;
    const manualPattern = options.manual_pattern || options.files;

    // Validate manual strategy configuration
    if (options.strategy === 'manual') {
        if (!manualPattern) {
            throw new Error(`Manual strategy requires 'manual_pattern' configuration but it was not found`);
        }
        if (!manualPattern[placement]) {
            throw new Error(`Manual strategy requires 'manual_pattern.${placement}' array but it was not found`);
        }
        if (!Array.isArray(manualPattern[placement])) {
            throw new Error(`Manual strategy requires 'manual_pattern.${placement}' to be an array but got ${typeof manualPattern[placement]}`);
        }
        if (autoPattern && placement === 'body_first') {
            log.warn('js_compactor: Manual strategy is active: ignoring auto_pattern/pattern configuration (use manual_pattern instead)');
        }
    } else if (options.strategy === 'auto') {
        if (manualPattern && placement === 'body_first') {
            log.warn('js_compactor: Auto strategy is active: ignoring manual_pattern/files configuration (use auto_pattern/pattern instead)');
        }
    }

    // Manual strategy: use explicitly specified files
    if (options.strategy === 'manual' && manualPattern && manualPattern[placement]) {
        const manualFiles = manualPattern[placement];
        
        // Add only exact file paths to scripts (not regex patterns)
        for (const file of manualFiles) {
            // Skip regex patterns - only add exact file paths
            if (!file.includes('(') && !file.includes('[') && !file.includes('*') && !file.includes('^') && !file.includes('$')) {
                const formattedFile = route.format(file);
                if (scripts.indexOf(formattedFile) === -1) {
                    scripts.push(formattedFile);
                }
            }
        }
        
        // Remove matching files from HTML
        for (const path of htmlPaths) {
            const html = htmls[path];
            const srcs = html.srcs;
            
            for (let i = srcs.length - 1; i >= 0; --i) {
                const src = srcs[i];
                const formattedSrc = src; // srcs already contains formatted paths
                // Find original src from $scripts keys
                const originalSrc = Object.keys(html.$scripts).find(key => 
                    route.format(key) === src || key === src
                ) || src;
                
                // Check if script should be skipped
                if (manualPattern.skip) {
                    const skipPatterns = Array.isArray(manualPattern.skip) ? manualPattern.skip : [manualPattern.skip];
                    const shouldSkip = skipPatterns.some(skipPattern => {
                        try {
                            return originalSrc.match(skipPattern) || src.match(skipPattern) || formattedSrc.match(skipPattern);
                        } catch (e) {
                            return originalSrc === skipPattern || src === skipPattern || formattedSrc === skipPattern;
                        }
                    });
                    if (shouldSkip) continue;
                }
                
                // Check if any manual file matches this script (exact match or regex)
                const matchesManual = manualFiles.some(file => {
                    const formattedFile = route.format(file);
                    // Exact match
                    if (originalSrc === file || src === file || src === formattedFile || formattedSrc === formattedFile) {
                        return true;
                    }
                    // Regex match
                    try {
                        return originalSrc.match(file) || src.match(file) || formattedSrc.match(file);
                    } catch (e) {
                        return false;
                    }
                });
                
                if (matchesManual) {
                    // Add to scripts if not already included
                    if (scripts.indexOf(formattedSrc) === -1) {
                        scripts.push(formattedSrc);
                    }
                    
                    // Remove from HTML
                    log.debug(`Concate JS: remove ${src} from ${path} (manual)`);
                    if (html.$scripts[originalSrc]) {
                        html.$scripts[originalSrc].remove();
                        html.$scripts[originalSrc] = null;
                    }
                    if (html.$scripts[src]) {
                        html.$scripts[src].remove();
                        html.$scripts[src] = null;
                    }
                    const srcIndex = srcs.indexOf(src);
                    if (srcIndex !== -1) {
                        srcs.splice(srcIndex, 1);
                    }
                }
            }
            html.srcs = srcs;
        }
    } else {
        // Auto strategy: discover scripts that appear in multiple pages
        for (const path of htmlPaths) {
            const html = htmls[path];
            const srcs = html.srcs;
            for (let i = srcs.length - 1; i >= 0; --i) { // reverse for deletion
                const src = srcs[i];

                if (placement == 'body_first') {
                    if (!src.match(autoPattern.body_first)) {
                        continue;
                    }
                }

                if (placement == 'body_last') {
                    if (!src.match(autoPattern.body_last)) {
                        continue;
                    }
                }

                if (scripts.indexOf(src) === -1) {
                    // if a script exists in more than one htmls,
                    const count = htmlPaths.reduce((sum, path) => {
                        return htmls[path].srcs.includes(src) ? sum + 1 : sum;
                    }, 0);
                    if (count > 1) {
                        // remove
                        log.debug(`Concate JS: remove ${src} from ${path}`);
                        if (html.$scripts[src]) {
                            html.$scripts[src].remove();
                            html.$scripts[src] = null;
                        }
                        const srcIndex = srcs.indexOf(src);
                        if (srcIndex !== -1) {
                            srcs.splice(srcIndex, 1);
                        }
                        scripts.push(src);
                    }
                } else {
                    // remove
                    log.debug(`Concate JS: remove ${src} from ${path}`);
                    if (html.$scripts[src]) {
                        html.$scripts[src].remove();
                        html.$scripts[src] = null;
                    }
                    const srcIndex = srcs.indexOf(src);
                    if (srcIndex !== -1) {
                        srcs.splice(srcIndex, 1);
                    }
                }
            }
            html.srcs = srcs;
        }
    }

    // Bundle script injection is handled by Hexo's injector system
    // No need to manually inject script tags here
    return scripts.reverse();
}

function concatScripts(scripts, log, options, route, bundlePath) {
    if (!scripts) return;
    if (scripts.length < 1) return;

    log.debug(`Concate JS: try to concat ${scripts.length} scripts`);
    
    if (options.debug && options.debug.enable) {
        log.info(`Debug: Files being concatenated into ${bundlePath}:`);
        scripts.forEach(script => log.info(`  - ${script}`));
    }

    return Promise.all(scripts.map(path => {
        return new Promise((resolve, reject) => {
            try {
                const script = route.get(path);
                let scriptTxt = '';
                if (!script) {
                    log.error(`Concate JS: script ${path} is not found, skipping`);
                    resolve("");
                    return;
                }
                
                script.on('data', chunk => (scriptTxt += chunk));
                script.on('end', () => {
                    try {
                        if (!fs.existsSync('temp')){
                            fs.mkdirSync('temp', { recursive: true });
                        }
                        fs.appendFileSync('temp/remove.txt', `${path}\n`);

                        log.debug(`Concate JS: concat script ${path}`);
                        resolve(scriptTxt);
                    } catch (error) {
                        log.error(`Error processing script ${path}: ${error.message}`);
                        resolve("");
                    }
                });
                
                script.on('error', (error) => {
                    log.error(`Error reading script ${path}: ${error.message}`);
                    resolve("");
                });
            } catch (error) {
                log.error(`Error getting script ${path}: ${error.message}`);
                resolve("");
            }
        });
    })).then(results => {
        const bundleScript = results.reduce((txt, script) => (txt += script), '');
        route.set(route.format(bundlePath), bundleScript);

        try {
            const dest = `temp${bundlePath}`;
            const dir = require('path').dirname(dest);

            if (!fs.existsSync(dir)){
                log.info(`Concate JS: created: ${dir}`);
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(dest, bundleScript);
        } catch (error) {
            log.error(`Error writing bundle file: ${error.message}`);
        }

        log.info(`Concate JS: finish concat js script: ${bundlePath}`);
    });
}

function concatJS(hexo) {
    const options = hexo.config.js_compactor.concat;
    const downloads = hexo.config.js_compactor.downloads;
    // Reture if disabled.
    if (options.enable === false) return;

    const log = hexo.log || console;
    const route = hexo.route;
    const routeList = route.list();

   return getLocalScripts(log, routeList, route, options)
        .then(() => extractCommonScripts(log, options, route, options.bundle_path.body_first, 'body_first', downloads))
        .then((scripts) => concatScripts(scripts, log, options, route, options.bundle_path.body_first))
        .then(() => extractCommonScripts(log, options, route, options.bundle_path.body_last, 'body_last', downloads))
        .then((scripts) => concatScripts(scripts, log, options, route, options.bundle_path.body_last))
        .then(() => {
            // Update all HTML files after all processing is complete
            const htmlPaths = Object.keys(htmls);
            for (const path of htmlPaths) {
                const html = htmls[path];
                route.set(path, html.$.html());
            }
        });
}

module.exports = concatJS;