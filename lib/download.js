'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');


const downloadFile = (url, dest, log) => {
    // Validate URL to prevent SSRF
    try {
        const urlObj = new URL(url);
        if (!['https:', 'http:'].includes(urlObj.protocol)) {
            throw new Error('Only HTTP/HTTPS URLs are allowed');
        }
    } catch (error) {
        return Promise.reject(new Error(`Invalid URL: ${error.message}`));
    }

    // Validate and sanitize destination path
    const resolvedDest = path.resolve(dest);
    if (!resolvedDest.startsWith(process.cwd())) {
        return Promise.reject(new Error('Destination path outside project directory'));
    }

    const dir = path.dirname(resolvedDest);

    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        return Promise.reject(new Error(`Failed to create directory: ${error.message}`));
    }

    return new Promise((resolve, reject) => {
        fs.access(resolvedDest, fs.constants.F_OK, (err) => {
            if (err) {
                const file = fs.createWriteStream(resolvedDest);

                const request = https.get(url, (response) => {
                    if (response.statusCode !== 200) {
                        file.destroy();
                        fs.unlink(resolvedDest, () => {});
                        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        return;
                    }

                    response.pipe(file);
        
                    file.on('finish', () => {
                        file.close((err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    file.on('error', (error) => {
                        fs.unlink(resolvedDest, () => {});
                        reject(error);
                    });
                });
        
                request.on('error', (error) => {
                    file.destroy();
                    fs.unlink(resolvedDest, () => {});
                    reject(error);
                });

                request.setTimeout(30000, () => {
                    request.destroy();
                    reject(new Error('Download timeout'));
                });
            } else {
                log.debug(`File already exists: ${resolvedDest}`);
                resolve();
            }
        });
    });
};



function downloadJS(hexo) {
    const options = hexo.config.js_compactor?.downloads;
    const log = hexo.log || console;

    if (!options) {
        return Promise.resolve();
    }

    // Support both old array format and new object format
    const skipExisting = options.skip_existing !== false; // default true
    const downloadList = options.files || options; // new format or fallback to old

    if (!Array.isArray(downloadList)) {
        return Promise.resolve();
    }

    const downloadPromises = downloadList.map(download => {
        if (!download.url || !download.local) {
            log.error('Invalid download configuration: missing url or local path');
            return Promise.resolve();
        }

        // Skip if file exists and skip_existing is true
        if (skipExisting && fs.existsSync(download.local)) {
            log.debug(`Skipping download, file already exists: ${download.local}`);
            return Promise.resolve();
        }

        return downloadFile(download.url, download.local, log)
            .then(() => log.info(`File downloaded: ${download.local}`))
            .catch((error) => {
                log.error(`Download failed for ${download.url}: ${error.message}`);
                return Promise.resolve(); // Don't fail the entire process
            });
    });

    return Promise.all(downloadPromises);
}

module.exports = downloadJS;
