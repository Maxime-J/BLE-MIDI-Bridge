import {
  createWriteStream,
  existsSync,
  mkdirSync
} from 'node:fs';
import { get } from 'node:https';
import { join } from 'node:path';
import { pipeline } from 'node:stream';

const dest = 'app/assets';

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
    get(url, (res) => {
      if (res.statusCode != 200) {
        res.resume();
        reject();
      }
      const filePath = join(dest, file);
      const fileStream = createWriteStream(filePath);
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

if (!existsSync(dest)) mkdirSync(dest);

for (const [url, file] of assets) {
  await download(url, file);
}