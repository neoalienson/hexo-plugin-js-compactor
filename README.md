![GitHub last commit](https://img.shields.io/github/last-commit/neoalienson/hexo-plugin-js-compactor )
![GitHub package.json version](https://img.shields.io/github/package-json/v/neoalienson/hexo-plugin-js-compactor)
  
# hexo-plugin-js-compactor

Minify, concat JS files, and then insert after beginning or before ending of body tag.
Created from https://github.com/chenzhutian/hexo-all-minifier focusing on JS. Compatible with Hexo 5.0 or above.

## Configurations

To enable the plugin add this to your _config.yml. The example places jQuery at the beginning of body, the rest near the end of body:

```
js_compactor:
  enable: true
  minify:
    enable: true
  concat:
    enable: true
    debug:
      enable: false  # when enabled, lists files that have been concatenated
    bundle_path:
        body_first: '/js/bundle_first.js'
        body_last: '/js/bundle_last.js'
    pattern:
        skip: 'echarts\.min\.js' # file size is too large, which would slow down for first visit
        body_first: 'jquery\.min\.js'
        body_last: '^(?!.*jquery\.min\.js).*$'    
```

Paths under `bundle_path` are the output files from the concatenation. Patterns are regular expression.

### Download remote JS

You can download remote JS files to local storage. However, the file must be downloaded under the source folder.

```
  downloads:
  - url: https://raw.githubusercontent.com/apache/echarts/5.5.0/dist/echarts.min.js
    local: source/cache/echarts.min.js

```

## Known Issues

1. Only JS from posts is extracted. JS from pages is not extracted.

## Testing

Run the test suite:

```bash
npm test
```

The tests include:
- Debug functionality verification
- Configuration handling
- Error handling scenarios

## Contributing

Keep it simple for now. Any pull request is welcome and will be reviewed.