'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');


const downloadFile = (url, dest, log) => {
    const dir = path.dirname(dest);

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        
        fs.access(dest, fs.constants.F_OK, (err) => {
            if (err) {
                const file = fs.createWriteStream(dest);

                const request = https.get(url, (response) => {
                    response.pipe(file);
        
                    file.on('finish', () => {
                        file.close(resolve);
                    });
                });
        
                request.on('error', (error) => {
                    fs.unlink(dest, () => {
                        reject(error);
                    });
                });
            } else {
            }
        });
    });
};



function downloadJS(hexo) {
    const options = hexo.config.js_compactor.downloads;

    const log = hexo.log;
    // download and add script
    if (options) {
        for (const download of options) {
            downloadFile(download.url, download.local, hexo.log)
            .then(() => log.info(`File downloaded: ${download.local}`))
            .catch((error) => console.error('Error:', error));
        }
    }
}

module.exports = downloadJS;
