
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

  it('should filter out non-html files', () => {
    const routeList = ['index.html', 'styles.css', 'script.js'];
    const htmlFiles = routeList.filter(path => path.endsWith('.html'));
    expect(htmlFiles).toEqual(['index.html']);
  });
});