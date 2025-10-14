const concatJS = require('./lib/concat');

// Test the original failing configuration
const mockHexo = {
  config: {
    js_compactor: {
      concat: {
        enable: true,
        strategy: 'manual',
        debug: { enable: true },
        bundle_path: {
          body_first: '/js/bundle_first.js',
          body_last: '/js/bundle_last.js'
        },
        manual_pattern: {
          skip: 'local\\.js$',
          body_first: ['/cache/jquery.min.js'],
          body_last: ['^(?!.*jquery\\.min\\.js).*$']
        }
      }
    }
  },
  log: { debug: console.log, info: console.log, warn: console.log, error: console.log },
  route: {
    list: () => ['index.html'],
    get: () => ({
      on: (event, callback) => {
        if (event === 'data') callback('<script src="/js/local.js"></script><script src="/cache/jquery.min.js"></script>');
        if (event === 'end') callback();
      }
    }),
    format: (path) => path.startsWith('/') ? path.substring(1) : path,
    set: (path, content) => console.log(`Updated ${path}:`, content)
  }
};

concatJS(mockHexo).then(() => {
  console.log('✅ Configuration test completed successfully!');
}).catch(err => {
  console.error('❌ Configuration test failed:', err.message);
});