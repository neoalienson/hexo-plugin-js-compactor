
describe('getLocalScripts', () => {
  const route = {};
  const htmls = {};

  beforeEach(() => {
    hexo = {
        config: {
            analytics: {
                google_analytics: {
                    enable: false
                }
            }
        }
    };
    route.get = jest.fn((path) => {
      return {
        on: (event, callback) => {
          callback('');
        },
        end: () => {}
      };
    });
  });

  it('should filter out non-html files', async () => {
    const routeList = ['index.html', 'styles.css', 'script.js'];
    const result = await require('../lib/concat');
    expect(result).toEqual([]);
  });
});