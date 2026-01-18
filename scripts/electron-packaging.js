import { copyFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { packager } from '@electron/packager';

import pkg from '../package.json' with { type: 'json' };

const dest = 'bundles';
const aboutFile = 'about.txt';

const bundles = await packager({
  dir: 'app',
  asar: { unpack: 'midi-out.node' },
  out: dest,
  platform: 'win32',
  arch: 'x64',
  icon: 'app.ico',
  appCopyright: `Copyright (C) 2024-2026 ${pkg.author}`
});

for (const bundle of bundles) {
  const electronLicense = join(bundle, 'LICENSE');
  unlinkSync(electronLicense);

  copyFileSync(aboutFile, join(bundle, aboutFile));
}