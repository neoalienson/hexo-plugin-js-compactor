![GitHub last commit](https://img.shields.io/github/last-commit/neoalienson/hexo-plugin-js-compactor )
![GitHub package.json version](https://img.shields.io/github/package-json/v/neoalienson/hexo-plugin-js-compactor)
  
# hexo-plugin-js-compactor

Minifiy, concat js files,  and then insert to after beginning or before endding of body tag.
Create from https://github.com/chenzhutian/hexo-all-minifier focus on js. Compatible to Hexo 5.0 or above.

## Configurations

To enable the plugin add this to your config.yml . The example place jquery into beginning of body, the rest near the end of body:

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

### Download remote js

You can download remote js to local. However, the file must download under source folder.

```
  downloads:
  - url: https://raw.githubusercontent.com/apache/echarts/5.5.0/dist/echarts.min.js
    local: source/cache/echarts.min.js

```

## Issues

1. Only js from post is extracted. js from page is not extracted.

## Contribution

Keep it simple and stupid for now. Any pull request is welcomed and will reviewed.