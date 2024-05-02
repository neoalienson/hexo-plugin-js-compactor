/* global hexo */
// const { config } = hexo;

// if (config) {
//     if (!config.concatjs) {
//         return;
//     }
//     if (!config.concatjs.enable) {
//         return;
//     }

//     hexo.extend.filter.register('after_render:js', require('./lib/optimize'));
//     hexo.extend.filter.register('after_generate', require('./lib/concat'));
// }

/* global hexo */
function run(config) {
    if (!config) {
        return;
    }
    if (!config.enable) {
        return;
    }

    hexo.extend.filter.register('after_post_render', function(data){
        console.log(data);
        return data;
    });

    hexo.extend.filter.register('after_generate', function(){
        require('./lib/concat')(this);
    });

    hexo.extend.injector.register('body_start', config.concat.bundle_path.body_first);
    hexo.extend.injector.register('body_end', config.concat.bundle_path.body_last);
}

run(hexo.config.concatjs);