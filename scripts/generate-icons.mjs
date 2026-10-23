#!/usr/bin/env node
/**
 * Generates every OS icon from the primary Zest mark.
 *
 *   npm run icons:generate
 *
 * Source: packages/bruno-app/src/assets/zest/zest-mark.svg
 * Output: packages/bruno-electron/resources/icons/{png,mac,win}/** and
 *         packages/bruno-electron/src/about/256x256.png (BrowserWindow icon).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import png2icons from 'png2icons';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'packages/bruno-app/src/assets/zest/zest-mark.svg');
const electron = path.join(root, 'packages/bruno-electron');
const iconsDir = path.join(electron, 'resources/icons');
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

const svg = await fs.readFile(source);
const render = (size) => sharp(svg, { density: Math.ceil((72 * size) / 100) * 2 })
  .resize(size, size)
  .png({ compressionLevel: 9 })
  .toBuffer();

await fs.mkdir(path.join(iconsDir, 'png'), { recursive: true });
await fs.mkdir(path.join(iconsDir, 'mac'), { recursive: true });
await fs.mkdir(path.join(iconsDir, 'win'), { recursive: true });

const pngs = {};
for (const size of SIZES) {
  pngs[size] = await render(size);
  await fs.writeFile(path.join(iconsDir, 'png', `${size}x${size}.png`), pngs[size]);
}
await fs.writeFile(path.join(electron, 'src/about/256x256.png'), pngs[256]);

const icns = png2icons.createICNS(pngs[1024], png2icons.BICUBIC, 0);
if (!icns) throw new Error('png2icons failed to create .icns');
await fs.writeFile(path.join(iconsDir, 'mac/icon.icns'), icns);

const ico = png2icons.createICO(pngs[1024], png2icons.BICUBIC, 0, false, true);
if (!ico) throw new Error('png2icons failed to create .ico');
await fs.writeFile(path.join(iconsDir, 'win/icon.ico'), ico);

console.log(`Generated Zest icons from ${path.relative(root, source)}`);
