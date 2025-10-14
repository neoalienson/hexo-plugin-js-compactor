![GitHub last commit](https://img.shields.io/github/last-commit/neoalienson/hexo-plugin-js-compactor )
![GitHub package.json version](https://img.shields.io/github/package-json/v/neoalienson/hexo-plugin-js-compactor)
  
# hexo-plugin-js-compactor

A Hexo plugin that optimizes JavaScript files by minifying, concatenating, and strategically placing them in your HTML output.
Created from https://github.com/chenzhutian/hexo-all-minifier focusing on JS. Compatible with Hexo 5.0 or above.

## Goal

This plugin aims to solve common JavaScript performance issues in Hexo static sites:

**Problem**: Static sites often load multiple small JS files separately, causing:
- Too many HTTP requests slowing down page load
- Unoptimized JavaScript with unnecessary whitespace and comments
- Poor script loading order affecting page functionality
- Duplicate scripts loaded across different pages
- Remote dependencies may become unavailable or slow to load

**Solution**: Automatically optimize JavaScript delivery by:
- **Minifying** JS files to reduce bandwidth usage
- **Concatenating** related scripts into strategic bundles
- **Eliminating duplicates** across your entire site
- **Optimizing load order** with framework scripts first, application scripts last
- **Caching remote dependencies** locally for better performance

**Result**: Faster loading Hexo sites with fewer HTTP requests and optimized JavaScript delivery.

## ⚠️ Security Warning

**IMPORTANT**: When using the download feature, only download JavaScript files from trusted sources:

- ✅ **Safe**: Official CDNs (jsdelivr, cdnjs, unpkg)
- ✅ **Safe**: Official project repositories (GitHub releases)
- ✅ **Safe**: Well-known library maintainers
- ❌ **Risky**: Unknown or suspicious domains
- ❌ **Risky**: Non-HTTPS URLs (blocked by plugin)
- ❌ **Risky**: Files from untrusted third parties

**Why this matters**: Downloaded JavaScript files are executed in your site's context and can:
- Access sensitive data
- Modify your site's behavior
- Inject malicious content
- Compromise user security

Always verify the source and integrity of remote JavaScript files before downloading.

## How It Works

The plugin operates in three main phases during Hexo's build process:

### 1. Download Phase (`before_generate`)
- Downloads remote JS files to local storage if configured
- Validates URLs to prevent security issues
- Caches files to avoid repeated downloads

### 2. Minification Phase (`after_render:js`)
- Minifies individual JS files using UglifyJS
- Reduces file size by removing whitespace, comments, and optimizing code
- Skips files matching exclude patterns

### 3. Concatenation Phase (`after_generate`)
- Scans all HTML files for local `<script>` tags
- Groups scripts based on placement patterns:
  - `body_first`: Scripts to load early (e.g., jQuery)
  - `body_last`: Regular scripts loaded at page end
- Removes duplicate script references across pages
- Combines matching scripts into bundle files
- Injects bundle script tags into HTML

### Bundle Injection
- `body_first` bundle: Injected at `<body>` start
- `body_last` bundle: Injected before `</body>` end
- Original script tags are removed to avoid duplication

## Installation

```bash
npm install @neoalienson/hexo-plugin-js-compactor
```

## Configuration

To enable the plugin add this to your _config.yml. The example places jQuery at the beginning of body, the rest near the end of body:

```yaml
js_compactor:
  enable: true                    # Enable the plugin
  minify:
    enable: true                  # Enable JS minification
    exclude: ['*.min.js']         # Skip already minified files
  concat:
    enable: true                  # Enable JS concatenation
    strategy: 'auto'              # 'auto' or 'manual' extraction strategy
    debug:
      enable: false               # Log concatenated files when true
    bundle_path:
      body_first: '/js/bundle_first.js'  # Early-loading scripts bundle
      body_last: '/js/bundle_last.js'    # Regular scripts bundle
    # Auto strategy: regex patterns for auto-discovery
    auto_pattern:
      skip: 'echarts\.min\.js'          # Skip large files (regex)
      body_first: 'jquery\.min\.js'     # Match for early bundle (regex)
      body_last: '^(?!.*jquery\.min\.js).*$'  # Match for late bundle (regex)
    # Manual strategy: exact paths or regex patterns
    manual_pattern:
      body_first: ['/js/jquery.min.js', 'bootstrap\.min\.js']
      body_last: ['/js/utils.js', '/js/app.js', 'cache/.*\.js']
```

### Configuration Options

- **strategy**: Extraction strategy (`auto` or `manual`)
  - `auto`: Auto-discover scripts that appear in multiple pages (default)
  - `manual`: Use explicitly specified file lists or patterns
- **bundle_path**: Output paths for concatenated bundles
- **auto_pattern**: Regular expressions for auto strategy (replaces `pattern`)
  - `skip`: Files to exclude from concatenation
  - `body_first`: Scripts for early loading (e.g., frameworks)
  - `body_last`: Regular application scripts
- **manual_pattern**: File paths or regex patterns for manual strategy (replaces `files`)
  - `body_first`: Array of exact paths or regex patterns for early bundle
  - `body_last`: Array of exact paths or regex patterns for late bundle
- **debug**: When enabled, logs which files are being concatenated

#### Backward Compatibility
- `pattern` still works (alias for `auto_pattern`)
- `files` still works (alias for `manual_pattern`)

### Download Remote JS

Download remote JS files to local storage for better performance and offline capability:

```yaml
js_compactor:
  downloads:
    skip_existing: true  # Skip download if file already exists (default: true)
    files:
      - url: https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js
        local: source/js/jquery.min.js
      - url: https://raw.githubusercontent.com/apache/echarts/5.5.0/dist/echarts.min.js
        local: source/cache/echarts.min.js
```

**Configuration Options:**
- `skip_existing`: When `true`, skips download if local file already exists. Set to `false` to always re-download.

**Security Note**: Only HTTPS URLs are allowed. Files must be downloaded under the `source/` folder.

## Performance Impact

- **Reduced HTTP Requests**: Multiple JS files combined into 1-2 bundles
- **Smaller File Sizes**: Minification reduces bandwidth usage by 20-40%
- **Better Caching**: Bundled files can be cached more effectively
- **Optimized Loading**: Critical scripts load first, others load last
- **Faster Page Speed**: Typical 30-50% improvement in JavaScript load time

## Example Workflow

**Before Processing:**
```html
<script src="/js/jquery.min.js"></script>
<script src="/js/utils.js"></script>
<script src="/js/app.js"></script>
```

**After Processing:**
```html
<!-- jQuery loaded first -->
<script src="/js/bundle_first.js"></script>
<!-- Other scripts loaded at end -->
<script src="/js/bundle_last.js"></script>
```

## Extraction Strategies

### Auto Strategy (Default)
- Automatically discovers scripts that appear in multiple HTML files
- Only extracts commonly used scripts across the site
- Uses regex patterns to match and categorize scripts
- Good for sites with consistent script usage patterns

### Manual Strategy
- Explicitly specify which JS files to bundle using exact paths or regex patterns
- Bundles specified files regardless of usage frequency
- Provides full control over what gets concatenated
- Supports both exact matching (`/js/jquery.min.js`) and regex patterns (`jquery\.min\.js`)
- Ideal when you know exactly which scripts should be bundled

## Known Issues

1. Bundle files are created in both `public/` and `temp/` directories.

## Development

### Testing

Run the test suite:

```bash
npm test
```

The tests include:
- Debug functionality verification
- Configuration handling
- Error handling scenarios
- Security validation

### File Structure

```
lib/
├── concat.js    # Concatenation logic
├── minify.js    # Minification using UglifyJS
└── download.js  # Remote file downloading
test/
├── debug.test.js # Debug functionality tests
└── a.test.js     # Core functionality tests
```

## Related Plugins

For CSS optimization, consider using a dedicated CSS concatenation plugin that follows the same architecture patterns as this JS plugin.

## Contributing

Keep it simple for now. Any pull request is welcome and will be reviewed.