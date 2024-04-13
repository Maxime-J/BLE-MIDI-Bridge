const path = require('node:path');
const fs = require('node:fs');
const asar = require('@electron/asar');
const packager = require('@electron/packager');
const { author } = require('../package.json');

const dest = 'bundles';
const aboutFile = 'about.txt';

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest);
}

(async function (){
  const asarFile = path.join(dest, 'app.asar');
  await asar.createPackage('app', asarFile);

  const bundles = await packager({
    dir: '.',
    prebuiltAsar: asarFile,
    out: dest,
    platform: 'win32',
    arch: 'x64',
    appCopyright: `Copyright (C) 2024 ${author}`
  });

  for (const bundle of bundles) {
    const oldLicense = path.join(bundle, 'LICENSE');
    const newLicense = path.join(bundle, 'LICENSE.electron.txt');
    fs.renameSync(oldLicense, newLicense);

    fs.copyFileSync(aboutFile, path.join(bundle, aboutFile));
  }
})();