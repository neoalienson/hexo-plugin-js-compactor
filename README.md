![GitHub last commit](https://img.shields.io/github/last-commit/neoalienson/hexo-plugin-js-compactor )
![GitHub package.json version](https://img.shields.io/github/package-json/v/neoalienson/hexo-plugin-js-compactor)
  
# hexo-plugin-js-compactor
Minifiy, concat js files,  and then insert to after beginning or before endding of body tag.
Create from https://github.com/chenzhutian/hexo-all-minifier focus on js, with last hexo version supported.

## Configurations

To enable the plugin add this to your config.yml . The example place jquery into beginning of body, the rest near the end of body:
```
js_compactor:
  enable: true
  minify:
    enable: true
  concat:
    enable: true
    bundle_path:
        body_first: '/js/bundle_first.js'
        body_last: '/js/bundle_last.js'
    pattern:
        body_first: 'jquery\.min\.js'
        body_last: '^(?!.*jquery\.min\.js).*$'
```

## Contribution

Keep it simple and stupid for now. Any pull request is welcomed and will reviewed.