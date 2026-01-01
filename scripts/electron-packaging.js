import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync
} from 'node:fs';
import { join } from 'node:path';
import { createPackage } from '@electron/asar';
import { packager } from '@electron/packager';

import pkg from '../package.json' with { type: 'json' };

const dest = 'bundles';
const aboutFile = 'about.txt';

if (!existsSync(dest)) mkdirSync(dest);

const asarFile = join(dest, 'app.asar');
await createPackage('app', asarFile);

const bundles = await packager({
  dir: '.',
  prebuiltAsar: asarFile,
  out: dest,
  platform: 'win32',
  arch: 'x64',
  appCopyright: `Copyright (C) 2024-2025 ${pkg.author}`
});

for (const bundle of bundles) {
  const oldLicense = join(bundle, 'LICENSE');
  const newLicense = join(bundle, 'LICENSE.electron.txt');
  renameSync(oldLicense, newLicense);

  copyFileSync(aboutFile, join(bundle, aboutFile));
}