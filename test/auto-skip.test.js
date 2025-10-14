const concatJS = require('../lib/concat');

describe('Auto Skip Patterns', () => {
  let mockHexo;
  let mockRoute;

  beforeEach(() => {
    const htmlContent = '<html><body><script src="/js/local.js"></script><script src="/js/app.js"></script></body></html>';
    
    mockRoute = {
      list: () => ['index.html'],
      get: (path) => {
        if (path === 'index.html') {
          return {
            on: (event, callback) => {
              if (event === 'data') callback(htmlContent);
              if (event === 'end') callback();
            }
          };
        }
        return null;
      },
      format: (path) => path.startsWith('/') ? path.substring(1) : path,
      set: jest.fn()
    };

    mockHexo = {
      config: {
        js_compactor: {
          concat: {
            enable: true,
            strategy: 'auto',
            bundle_path: {
              body_first: '/js/bundle_first.js',
              body_last: '/js/bundle_last.js'
            },
            auto_pattern: {
              skip: 'local\\.js$',
              body_last: '.*'
            }
          }
        }
      },
      log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      route: mockRoute
    };
  });

  it('should skip files matching auto skip pattern (string)', async () => {
    await concatJS(mockHexo);
    
    const setCall = mockRoute.set.mock.calls.find(call => call[0] === 'index.html');
    expect(setCall).toBeDefined();
    
    const updatedHtml = setCall[1];
    expect(updatedHtml).toContain('<script src="/js/local.js">'); // Should remain (skipped)
  });

  it('should skip files matching auto skip pattern (array)', async () => {
    mockHexo.config.js_compactor.concat.auto_pattern.skip = ['local\\.js$', 'vendor\\.js$'];
    
    await concatJS(mockHexo);
    
    const setCall = mockRoute.set.mock.calls.find(call => call[0] === 'index.html');
    expect(setCall).toBeDefined();
    
    const updatedHtml = setCall[1];
    expect(updatedHtml).toContain('<script src="/js/local.js">'); // Should remain (skipped)
  });
});