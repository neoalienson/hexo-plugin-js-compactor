'use strict';
const UglifyJS = require('uglify-js');
const minimatch = require('minimatch');

function MinifyJS(str, data) {
  const path = data.path;
  const hexo = this;
  const options = hexo.options;
  const log = this.log || console;
  // let exclude = options.exclude
  // if (exclude && !Array.isArray(exclude)) exclude = [exclude];

  // if (path && exclude) {
  //   for (let i = 0, len = exclude.length; i < len; i++) {
  //     if (minimatch(path, exclude[i], { matchBase: true })) return str;
  //   }
  // }

  const minifyOptions = Object.assign({}, options);
  // // remove unnecessory options
  delete minifyOptions.enable;
  delete minifyOptions.exclude;
  delete minifyOptions.silent;

  const result = UglifyJS.minify(str, minifyOptions);
  if (result.code) {
    const saved = ((str.length - result.code.length) / str.length * 100).toFixed(2);
     log.debug('Optimize JS: %s [ %s saved]', path, saved + '%');
    return result.code;
  }
  log.info(`Cannot minify the js of ${path}`);
  return str;
}

module.exports = MinifyJS;