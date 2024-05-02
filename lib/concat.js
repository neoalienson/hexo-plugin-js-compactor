'use strict';

const cheerio = require('cheerio');
const Promise = require('bluebird');

const htmls = {};

function getLocalScripts(routeList, route, log, options, path) {
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
                        if (src.startsWith('//') || src.startsWith('http')) return;
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

function extractCommonScripts(log, options, route, bundlePath, placement) {
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
                // TODO, or match the pattern in exclude array
                const count = htmlPaths.reduce((sum, path) => (htmls[path].srcs.indexOf(src) !== -1 ? ++sum : sum), 0);
                if (count > 1) {
                    // remove
                    //   log[options.silent ? 'debug' : 'info']('update Concate JS: remove %s from %s', src, path);
                    html.$scripts[src].remove();
                    delete html.$scripts[src];
                    srcs.splice(srcs.indexOf(src), 1);
                    scripts.push(src);
                }
                // if (htmlPaths.every(path => htmls[path].srcs.indexOf(src) !== -1) ||
                //   include.some(pattern => minimatch(src, pattern, { matchBase: true }))) {
                // }
            } else {
                // remove
                // log[options.silent ? 'debug' : 'info']('update Concate JS: remove %s from %s', src, path);
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
            log[options.silent ? 'debug' : 'info']('update Concate JS: add /%s to %s', route.format(bundlePath), path);
        }
    }
    return scripts.reverse();
}

function concatScripts(scripts, log, options, route, bundlePath) {
    if (!scripts) return;
    if (scripts.length < 1) return;
    log[options.silent ? 'debug' : 'info']('update Concate JS: try to concat %s scripts', scripts.length);
    return Promise.all(scripts.map(path => {
        return new Promise((resolve, reject) => {
            const script = route.get(path);
            let scriptTxt = '';
            if (!script) {
                log[options.silent ? 'debug' : 'info']('update Concate JS: script %s is not found, skipping', path);
                route.remove(path);
                resolve("");
                return;
            }
            script.on('data', chunk => (scriptTxt += chunk));
            script.on('end', () => {
                route.remove(path);
                log[options.silent ? 'debug' : 'info']('update Concate JS: concat script %s', path);
                resolve(scriptTxt);
            });
        });
    })).then(results => {
        const bundleScript = results.reduce((txt, script) => (txt += script), '');
        route.set(route.format(bundlePath), bundleScript);

        log[options.silent ? 'debug' : 'info']('update Concate JS: finish concat js script');
    });
}

function concatJS(data)  {
    const hexo = data;
    const options = hexo.config.optimisejs.concat;
    // Reture if disabled.
    if (options.enable === false) return;

    const log = hexo.log || console;
    const route = hexo.route;
    const routeList = route.list();

    return getLocalScripts(routeList, route, log, options)
        .then(() => extractCommonScripts(log, options, route, options.bundle_path.body_first, 'body_first'))
        .then((scripts) => concatScripts(scripts, log, options, route, options.bundle_path.body_first))
        .then(() => extractCommonScripts(log, options, route, options.bundle_path.body_last, 'body_last'))
        .then((scripts) => concatScripts(scripts, log, options, route, options.bundle_path.body_last));
}

module.exports = concatJS;