const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const { pipeline } = require('node:stream');

const dest = 'app/assets';

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest);
}

const assets = [
  [
    'https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/add/wght300/24px.svg',
    'add.svg'
  ],
  [
    'https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/close/wght300/24px.svg',
    'close.svg'
  ],
  [
    'https://raw.githubusercontent.com/fontsource/font-files/main/fonts/variable/noto-sans/files/noto-sans-latin-wght-normal.woff2',
    'noto-sans-latin.woff2'
  ],
  [
    'https://raw.githubusercontent.com/fontsource/font-files/main/fonts/variable/noto-sans/files/noto-sans-latin-ext-wght-normal.woff2',
    'noto-sans-latin-ext.woff2'
  ]
];

function download(url, file) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode != 200) {
        res.resume();
        reject();
      }
      const filePath = path.join(dest, file);
      const fileStream = fs.createWriteStream(filePath);
      pipeline(res, fileStream, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  })
}


(async function(){
  for (const [url, file] of assets) {
    try {
      await download(url, file);
    } catch (err) {
      throw err;
    }
  }
})();