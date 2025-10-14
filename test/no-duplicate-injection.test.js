const concatJS = require('../lib/concat');

describe('No Duplicate Bundle Injection', () => {
  let mockHexo, mockRoute;

  beforeEach(() => {
    mockRoute = {
      list: () => ['index.html'],
      get: (path) => {
        if (path === 'index.html') {
          return {
            on: (event, callback) => {
              if (event === 'data') callback('<html><body><script src="/js/app.js"></script></body></html>');
              if (event === 'end') callback();
            }
          };
        }
        if (path === 'js/app.js') {
          return {
            on: (event, callback) => {
              if (event === 'data') callback('console.log("app");');
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
            strategy: 'manual',
            bundle_path: {
              body_first: '/js/bundle_first.js',
              body_last: '/js/bundle_last.js'
            },
            manual_pattern: {
              body_first: [],
              body_last: ['/js/app.js']
            }
          }
        }
      },
      log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      route: mockRoute
    };
  });

  it('should not inject bundle script tags into HTML', async () => {
    await concatJS(mockHexo);
    
    const setCall = mockRoute.set.mock.calls.find(call => call[0] === 'index.html');
    expect(setCall).toBeDefined();
    
    const updatedHtml = setCall[1];
    // Should not contain bundle script tags (Hexo injector handles this)
    expect(updatedHtml).not.toContain('<script src="/js/bundle_first.js">');
    expect(updatedHtml).not.toContain('<script src="/js/bundle_last.js">');
    // Original script should be removed
    expect(updatedHtml).not.toContain('<script src="/js/app.js">');
  });
});