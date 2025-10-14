const concatJS = require('../lib/concat');

describe('Script Removal', () => {
  let mockHexo;
  let mockRoute;
  let htmlContent;

  beforeEach(() => {
    htmlContent = '<html><body><script src="/cache/jquery.min.js"></script><script src="/cache/cookieconsent.min.js"></script></body></html>';
    
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
        if (path === 'cache/jquery.min.js' || path === 'cache/cookieconsent.min.js') {
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
              body_last: ['/cache/cookieconsent.min.js']
            }
          }
        }
      },
      log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      route: mockRoute
    };
  });

  it('should remove script tags from HTML when using manual strategy', async () => {
    await concatJS(mockHexo);
    
    // Check that route.set was called to update HTML
    expect(mockRoute.set).toHaveBeenCalled();
    
    // Get the updated HTML content
    const setCall = mockRoute.set.mock.calls.find(call => call[0] === 'index.html');
    expect(setCall).toBeDefined();
    
    const updatedHtml = setCall[1];
    expect(updatedHtml).not.toContain('<script src="/cache/jquery.min.js">');
    expect(updatedHtml).not.toContain('<script src="/cache/cookieconsent.min.js">');
  });

  it('should create bundle files with specified scripts', async () => {
    await concatJS(mockHexo);
    
    // Check that bundle files were created
    const bundleFirstCall = mockRoute.set.mock.calls.find(call => call[0] === 'js/bundle_first.js');
    const bundleLastCall = mockRoute.set.mock.calls.find(call => call[0] === 'js/bundle_last.js');
    
    expect(bundleFirstCall).toBeDefined();
    expect(bundleLastCall).toBeDefined();
    expect(bundleFirstCall[1]).toContain('/* mock js */');
    expect(bundleLastCall[1]).toContain('/* mock js */');
  });
});