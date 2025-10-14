'use strict';

const UglifyJS = require('uglify-js');
const minimatch = require('minimatch');

function MinifyJS(str, data) {
  if (!str || typeof str !== 'string') {
    return str;
  }

  const path = data?.path || 'unknown';
  const hexo = this;
  const log = this.log || console;

  const options = hexo.config?.js_compactor?.minify;
  if (!options?.enable) return str;

  let exclude = options.exclude;
  if (exclude && !Array.isArray(exclude)) exclude = [exclude];

  if (path && exclude) {
    for (let i = 0, len = exclude.length; i < len; i++) {
      if (minimatch(path, exclude[i], { matchBase: true })) return str;
    }
  }

  const minifyOptions = Object.assign({}, options);
  // Remove unnecessary options
  delete minifyOptions.enable;
  delete minifyOptions.exclude;
  delete minifyOptions.silent;

  try {
    const result = UglifyJS.minify(str, minifyOptions);
    
    if (result.error) {
      log.warn(`Minification failed for ${path}: ${result.error.message}`);
      return str;
    }
    
    if (result.code) {
      const saved = ((str.length - result.code.length) / str.length * 100).toFixed(2);
      log.debug('Optimize JS: %s [%s saved]', path, saved + '%');
      return result.code;
    }
    
    log.warn(`No minified code generated for ${path}`);
    return str;
  } catch (error) {
    log.error(`Minification error for ${path}: ${error.message}`);
    return str;
  }
}

module.exports = MinifyJS;