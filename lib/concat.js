'use strict';

const cheerio = require('cheerio');
const Promise = require('bluebird');
const fs = require('fs');

const htmls = {};

function getLocalScripts(log, routeList, route, options, path) {

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
                        if (options.pattern.skip) {
                            if (src.match(options.pattern.skip)) {
                                return
                            }
                        }

                        // keep bundle_paths
                        if (src.endsWith(options.bundle_path.body_first)) return;
                        if (src.endsWith(options.bundle_path.body_last)) return;
                        
                        src = route.format(src);
                        // ignore and remove duplicated
                        if (srcs.indexOf(src) === -1) {
                            srcs.push(src);
                            $scripts[src] = $script;
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

    // collect the scripts
    for (const path of htmlPaths) {
        const html = htmls[path];
        const srcs = html.srcs;
        for (let i = srcs.length - 1; i >= 0; --i) { // reverse for deletion
            const src = srcs[i];

            if (placement == 'body_first') {
                if (!src.match(options.pattern.body_first)) {
                    continue;
                }
            }

            if (placement == 'body_last') {
                if (!src.match(options.pattern.body_last)) {
                    continue;
                }
            }

            if (scripts.indexOf(src) === -1) {
                // if a script exists in more than one htmls,
                const count = htmlPaths.reduce((sum, path) => (htmls[path].srcs.indexOf(src) !== -1 ? ++sum : sum), 0);
                if (count > 1) {
                    // remove
                    log.debug(`Concate JS: remove ${src} from ${path}`);
                    html.$scripts[src].remove();
                    delete html.$scripts[src];
                    srcs.splice(srcs.indexOf(src), 1);
                    scripts.push(src);
                }
            } else {
                // remove
                log.debug(`Concate JS: remove ${src} from ${path}`);
                html.$scripts[src].remove();
                delete html.$scripts[src];
                srcs.splice(srcs.indexOf(src), 1);
            }
        }
        html.srcs = srcs;
    }

    if (scripts.length > 0) {
        // add the bundle script to all html
        for (const path of htmlPaths) {
            const html = htmls[path];

            route.set(path, html.$.html());
            log.debug(`Concate JS: add /${route.format(bundlePath)} to ${path}`);
        }
    }
    return scripts.reverse();
}

function concatScripts(scripts, log, options, route, bundlePath) {
    if (!scripts) return;
    if (scripts.length < 1) return;

    log.debug(`Concate JS: try to concat ${scripts.length} scripts`);

    return Promise.all(scripts.map(path => {
        return new Promise((resolve, reject) => {
            const script = route.get(path);
            let scriptTxt = '';
            if (!script) {
                log.warn(`Concate JS: script ${path} is not found, skipping`);
                route.remove(path);
                resolve("");
                return;
            }
            script.on('data', chunk => (scriptTxt += chunk));
            script.on('end', () => {
                // TODO: a tactical solution
                // if (!fs.existsSync('temp')){
                //     fs.mkdirSync('temp', { recursive: true });
                // }
                // fs.appendFileSync('temp/remove.txt', `${path}\n`);

                // TODO: fatal error
                // route.remove(path);

                log.debug(`Concate JS: concat script ${path}`);
                resolve(scriptTxt);
            });
        });
    })).then(results => {
        const bundleScript = results.reduce((txt, script) => (txt += script), '');
        route.set(route.format(bundlePath), bundleScript);

        // TODO: a tactical solution
        // const dest = `temp${bundlePath}`;
        // const dir = require('path').dirname(dest);

        // if (!fs.existsSync(dir)){
        //     log.info(`Concate JS: created: ${dir}`);            
        //     fs.mkdirSync(dir, { recursive: true });
        // }

        // fs.writeFileSync(dest, bundleScript);
        
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
        .then((scripts) => concatScripts(scripts, log, options, route, options.bundle_path.body_last));
}

module.exports = concatJS;