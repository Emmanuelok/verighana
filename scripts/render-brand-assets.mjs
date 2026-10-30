import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const icon = await readFile('public/brand/app-icon.svg');
const maskable = await readFile('public/brand/app-icon-maskable.svg');
for (const size of [192, 512]) await sharp(icon).resize(size, size).png().toFile(`public/brand/icon-${size}.png`);
await sharp(maskable).resize(512, 512).png().toFile('public/brand/icon-maskable-512.png');
await sharp(icon).resize(180, 180).png().toFile('public/brand/apple-touch-icon.png');
for (const kind of ['logo', 'wordmark']) for (const variant of ['dark', 'light']) await sharp(`public/brand/${kind}-${variant}.svg`, { density: 192 }).png().toFile(`public/brand/${kind}-${variant}.png`);
await sharp('public/favicon.svg').resize(32, 32).png().toFile('public/brand/favicon-32.png');
await sharp('public/brand/og-master.svg').png().toFile('public/brand/og-fullview-signature.png');

// A compact review board combines only the newly authored vector identity masters.
const dark = await sharp('public/brand/logo-dark.svg').resize({ width: 610 }).png().toBuffer();
const light = await sharp('public/brand/logo-light.svg').resize({ width: 610 }).png().toBuffer();
const og = await sharp('public/brand/og-fullview-signature.png').resize(660, 347).toBuffer();
const tile = await sharp(icon).resize(145, 145).png().toBuffer();
await sharp({ create: { width: 1440, height: 880, channels: 4, background: '#f7f4ec' } }).composite([
  { input: Buffer.from('<svg width="1440" height="880"><rect x="0" y="425" width="720" height="455" fill="#073d35"/></svg>'), top: 0, left: 0 },
  { input: dark, top: 150, left: 55 }, { input: light, top: 605, left: 55 },
  { input: og, top: 50, left: 755 }, { input: tile, top: 497, left: 795 },
  { input: await sharp(icon).resize(80, 80).png().toBuffer(), top: 530, left: 1010 },
  { input: await sharp(icon).resize(40, 40).png().toBuffer(), top: 550, left: 1160 },
  { input: await sharp(icon).resize(20, 20).png().toBuffer(), top: 560, left: 1270 },
]).png().toFile('public/brand/identity-preview.png');
console.log('Rendered logo, OG, favicon, Apple icon and PWA icon family.');
