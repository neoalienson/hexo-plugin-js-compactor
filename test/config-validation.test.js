const concatJS = require('../lib/concat');

describe('Configuration Validation', () => {
  let mockHexo;

  beforeEach(() => {
    mockHexo = {
      config: {
        js_compactor: {
          concat: {
            enable: true,
            strategy: 'manual',
            bundle_path: {
              body_first: '/js/bundle_first.js',
              body_last: '/js/bundle_last.js'
            }
          }
        }
      },
      log: { debug: () => {}, info: () => {}, error: () => {} },
      route: {
        list: () => ['index.html'],
        get: () => ({
          on: (event, callback) => {
            if (event === 'data') callback('<html><body></body></html>');
            if (event === 'end') callback();
          }
        }),
        format: (path) => path,
        set: () => {}
      }
    };
  });

  it('should throw error when manual strategy has no manual_pattern config', async () => {
    await expect(concatJS(mockHexo)).rejects.toThrow("Manual strategy requires 'manual_pattern' configuration");
  });

  it('should throw error when manual strategy missing body_first array', async () => {
    mockHexo.config.js_compactor.concat.manual_pattern = { body_last: ['/js/app.js'] };
    await expect(concatJS(mockHexo)).rejects.toThrow("Manual strategy requires 'manual_pattern.body_first' array");
  });

  it('should throw error when manual_pattern.body_first is not an array', async () => {
    mockHexo.config.js_compactor.concat.manual_pattern = { 
      body_first: '/js/jquery.js',
      body_last: ['/js/app.js'] 
    };
    await expect(concatJS(mockHexo)).rejects.toThrow("Manual strategy requires 'manual_pattern.body_first' to be an array");
  });
});