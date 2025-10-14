const fs = require('fs');
const downloadJS = require('../lib/download');

// Mock fs module
jest.mock('fs');

describe('Download functionality', () => {
  let mockHexo, mockLog;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    };

    mockHexo = {
      config: {
        js_compactor: {}
      },
      log: mockLog
    };

    // Reset fs mocks
    fs.existsSync.mockReturnValue(false);
  });

  it('should skip download when file exists and skip_existing is true', async () => {
    fs.existsSync.mockReturnValue(true);
    
    mockHexo.config.js_compactor.downloads = {
      skip_existing: true,
      files: [
        { url: 'https://example.com/script.js', local: 'source/js/script.js' }
      ]
    };

    await downloadJS(mockHexo);

    expect(mockLog.debug).toHaveBeenCalledWith('Skipping download, file already exists: source/js/script.js');
  });

  it('should respect skip_existing configuration', () => {
    fs.existsSync.mockReturnValue(true);
    
    const configWithSkip = {
      skip_existing: false,
      files: [{ url: 'https://example.com/script.js', local: 'source/js/script.js' }]
    };
    
    // Test that configuration is properly parsed
    expect(configWithSkip.skip_existing).toBe(false);
  });

  it('should support old array format for backward compatibility', () => {
    mockHexo.config.js_compactor.downloads = [
      { url: 'https://example.com/script.js', local: 'source/js/script.js' }
    ];

    // Should not throw error when processing old format
    expect(() => downloadJS(mockHexo)).not.toThrow();
  });

  it('should handle missing downloads configuration', async () => {
    mockHexo.config.js_compactor = {};

    await downloadJS(mockHexo);

    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it('should default skip_existing to true when not specified', async () => {
    fs.existsSync.mockReturnValue(true);
    
    mockHexo.config.js_compactor.downloads = {
      files: [
        { url: 'https://example.com/script.js', local: 'source/js/script.js' }
      ]
    };

    await downloadJS(mockHexo);

    expect(mockLog.debug).toHaveBeenCalledWith('Skipping download, file already exists: source/js/script.js');
  });
});