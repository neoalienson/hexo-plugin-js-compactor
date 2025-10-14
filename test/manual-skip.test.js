const concatJS = require('../lib/concat');

describe('Manual Pattern Skip', () => {
  let mockHexo;
  let mockRoute;

  beforeEach(() => {
    const htmlContent = '<html><body><script src="/cache/jquery.min.js"></script><script src="/cache/large-lib.js"></script><script src="/cache/app.js"></script></body></html>';
    
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
        if (path === 'cache/jquery.min.js' || path === 'cache/app.js') {
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
              skip: ['large-lib\\.js'],
              body_first: ['/cache/jquery.min.js'],
              body_last: ['cache/.*\\.js']
            }
          }
        }
      },
      log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      route: mockRoute
    };
  });

  it('should skip files matching skip patterns', async () => {
    await concatJS(mockHexo);
    
    // Check that HTML still contains skipped script
    const setCall = mockRoute.set.mock.calls.find(call => call[0] === 'index.html');
    expect(setCall).toBeDefined();
    
    const updatedHtml = setCall[1];
    expect(updatedHtml).toContain('<script src="/cache/large-lib.js">'); // Should remain
    expect(updatedHtml).not.toContain('<script src="/cache/jquery.min.js">'); // Should be removed
    expect(updatedHtml).not.toContain('<script src="/cache/app.js">'); // Should be removed
  });

  it('should not include skipped files in bundle', async () => {
    await concatJS(mockHexo);
    
    // Verify large-lib.js is not in any bundle
    expect(mockHexo.log.error).not.toHaveBeenCalledWith(expect.stringContaining('large-lib.js is not found'));
    
    // Check bundle was created with non-skipped files
    const bundleCall = mockRoute.set.mock.calls.find(call => call[0] === 'js/bundle_last.js');
    expect(bundleCall).toBeDefined();
  });
});