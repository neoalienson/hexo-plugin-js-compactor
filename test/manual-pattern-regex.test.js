const concatJS = require('../lib/concat');

describe('Manual Pattern Regex', () => {
  let mockHexo;
  let mockRoute;

  beforeEach(() => {
    const htmlContent = '<html><body><script src="/cache/app.js"></script><script src="/cache/utils.js"></script></body></html>';
    
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
        if (path === 'cache/jquery.min.js' || path === 'cache/app.js' || path === 'cache/utils.js') {
          return {
            on: (event, callback) => {
              if (event === 'data') callback('/* mock js */');
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
              body_first: ['/cache/jquery.min.js'],
              body_last: ['^(?!.*jquery\\.min\\.js).*$']
            }
          }
        }
      },
      log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      route: mockRoute
    };
  });

  it('should not include regex patterns as file paths in bundle', async () => {
    await concatJS(mockHexo);
    
    // Check that bundle files were created
    const bundleFirstCall = mockRoute.set.mock.calls.find(call => call[0] === 'js/bundle_first.js');
    const bundleLastCall = mockRoute.set.mock.calls.find(call => call[0] === 'js/bundle_last.js');
    
    expect(bundleFirstCall).toBeDefined();
    expect(bundleLastCall).toBeDefined();
    
    // Verify no error logs about regex pattern not found
    expect(mockHexo.log.error).not.toHaveBeenCalledWith(expect.stringContaining('^(?!.*jquery\\.min\\.js).*$'));
  });

  it('should use regex patterns for matching existing scripts', async () => {
    await concatJS(mockHexo);
    
    // Check that HTML was updated (scripts removed by regex matching)
    const setCall = mockRoute.set.mock.calls.find(call => call[0] === 'index.html');
    expect(setCall).toBeDefined();
    
    const updatedHtml = setCall[1];
    // Scripts matching the regex should be removed from HTML
    expect(updatedHtml).not.toContain('<script src="/cache/app.js">');
    expect(updatedHtml).not.toContain('<script src="/cache/utils.js">');
  });
});