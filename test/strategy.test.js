const concatJS = require('../lib/concat');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

describe('Concatenation strategies', () => {
  let mockHexo, mockLog, mockRoute;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockRoute = {
      list: jest.fn(() => ['index.html', 'page.html']),
      get: jest.fn(),
      format: jest.fn(path => path),
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
            pattern: {
              body_first: 'jquery\\.min\\.js',
              body_last: '^(?!.*jquery\\.min\\.js).*$'
            }
          }
        }
      },
      log: mockLog,
      route: mockRoute
    };
  });

  it('should use auto strategy by default', async () => {
    mockRoute.get.mockImplementation((path) => {
      if (path.endsWith('.html')) {
        return {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('<html><body><script src="/js/jquery.min.js"></script></body></html>');
            } else if (event === 'end') {
              callback();
            }
          })
        };
      }
      return {
        on: jest.fn((event, callback) => {
          if (event === 'data') callback('console.log("test");');
          else if (event === 'end') callback();
        })
      };
    });
    
    await concatJS(mockHexo);
    
    // Should process with auto strategy (default behavior)
    expect(mockLog.debug).toHaveBeenCalled();
  });

  it('should use manual strategy when configured', async () => {
    mockHexo.config.js_compactor.concat.strategy = 'manual';
    mockHexo.config.js_compactor.concat.files = {
      body_first: ['/js/jquery.min.js'],
      body_last: ['/js/app.js']
    };

    mockRoute.get.mockImplementation((path) => {
      if (path.endsWith('.html')) {
        return {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('<html><body><script src="/js/jquery.min.js"></script><script src="/js/app.js"></script></body></html>');
            } else if (event === 'end') {
              callback();
            }
          })
        };
      }
      return {
        on: jest.fn((event, callback) => {
          if (event === 'data') callback('console.log("test");');
          else if (event === 'end') callback();
        })
      };
    });
    
    await concatJS(mockHexo);
    
    // Should log manual strategy removal
    const manualCalls = mockLog.debug.mock.calls.filter(call => 
      call[0] && call[0].includes('(manual)')
    );
    expect(manualCalls.length).toBeGreaterThan(0);
  });

  it('should handle missing strategy configuration gracefully', async () => {
    delete mockHexo.config.js_compactor.concat.strategy;
    
    mockRoute.get.mockImplementation(() => ({
      on: jest.fn((event, callback) => {
        if (event === 'data') callback('<html></html>');
        else if (event === 'end') callback();
      })
    }));
    
    await expect(concatJS(mockHexo)).resolves.not.toThrow();
  });
});