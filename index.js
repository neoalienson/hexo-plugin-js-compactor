/* global hexo */
function run(config) {
    if (!config) {
        return;
    }
    if (!config.enable) {
        return;
    }

    if (config.minify) {
        hexo.extend.filter.register('after_render:js', require('./lib/minify'));
    }

    hexo.extend.filter.register('after_generate', function(data){
        require('./lib/concat')(this);
    });

    if (config.concat.bundle_path.body_first) {
        hexo.extend.injector.register('body_start', `<script type="text/javascript" src="${config.concat.bundle_path.body_first}" ></script>`);
    }
    if (config.concat.bundle_path.body_last) {
        hexo.extend.injector.register('body_end', `<script type="text/javascript" src="${config.concat.bundle_path.body_last}" ></script>`);
    }
}

run(hexo.config.js_compactor);