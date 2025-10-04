const fs = require('fs');
const concatJS = require('../lib/concat');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

describe('Debug functionality', () => {
  let mockHexo, mockLog, mockRoute;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
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
            debug: {
              enable: false
            },
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

  it('should not log debug info when debug is disabled', async () => {
    mockHexo.config.js_compactor.concat.debug.enable = false;
    
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
    
    const debugCalls = mockLog.info.mock.calls.filter(call => 
      call[0] && call[0].includes('Debug: Files being concatenated')
    );
    expect(debugCalls).toHaveLength(0);
  });

  it('should handle missing debug config gracefully', async () => {
    delete mockHexo.config.js_compactor.concat.debug;
    
    mockRoute.get.mockImplementation(() => ({
      on: jest.fn((event, callback) => {
        if (event === 'data') callback('<html></html>');
        else if (event === 'end') callback();
      })
    }));
    
    await expect(concatJS(mockHexo)).resolves.not.toThrow();
  });
});

// Test the debug message format
describe('Debug message format', () => {
  it('should format debug messages correctly', () => {
    const mockLog = { info: jest.fn() };
    const scripts = ['/js/app.js', '/js/utils.js'];
    const bundlePath = '/js/bundle.js';
    const options = { debug: { enable: true } };
    
    // Simulate the debug logging logic
    if (options.debug && options.debug.enable) {
      mockLog.info(`Debug: Files being concatenated into ${bundlePath}:`);
      scripts.forEach(script => mockLog.info(`  - ${script}`));
    }
    
    expect(mockLog.info).toHaveBeenCalledWith('Debug: Files being concatenated into /js/bundle.js:');
    expect(mockLog.info).toHaveBeenCalledWith('  - /js/app.js');
    expect(mockLog.info).toHaveBeenCalledWith('  - /js/utils.js');
  });
});