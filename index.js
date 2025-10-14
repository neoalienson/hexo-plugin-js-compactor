/* global hexo */
function run(config) {
    if (!config?.enable) {
        return;
    }

    try {
        if (config.minify?.enable) {
            hexo.extend.filter.register('after_render:js', require('./lib/minify'));
        }

        hexo.extend.filter.register('before_generate', function(){
            return require('./lib/download')(this);
        }, 1);

        hexo.extend.filter.register('after_generate', function(){
            return require('./lib/concat')(this);
        }, 100);

        if (config.concat?.bundle_path?.body_first) {
            hexo.extend.injector.register('body_start', `<script type="text/javascript" src="${config.concat.bundle_path.body_first}"></script>`);
        }
        if (config.concat?.bundle_path?.body_last) {
            hexo.extend.injector.register('body_end', `<script type="text/javascript" src="${config.concat.bundle_path.body_last}"></script>`);
        }
    } catch (error) {
        const log = hexo.log || console;
        log.error(`JS Compactor initialization error: ${error.message}`);
    }
}

if (typeof hexo !== 'undefined' && hexo.config?.js_compactor) {
    run(hexo.config.js_compactor);
}