import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const { outputFiles } = await build({ entryPoints: ['lib/catalog.ts'], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { audiences, categories, services, rate } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const catalogue = {
  brand: 'Fullview Signature — by Veridanth',
  audiences: audiences.map(({ id, label }) => ({ id, label })),
  services: services.map(service => ({ id: service.id, title: service.title, description: service.description, category: categories.find(category => category.id === service.category)?.title || service.category, audiences: service.audiences, unit: service.unit, days: service.days, prices: Object.fromEntries(service.audiences.map(audience => [audience, rate(service, audience)])) })),
};
writeFileSync('public/offline-catalogue.json', JSON.stringify(catalogue));
const shell = ['offline.html','offline.css','offline.js','offline-catalogue.json','favicon.svg','brand/icon-192.png','brand/icon-512.png','brand/logo-light.svg'];
const hash = createHash('sha256');
for (const file of shell) hash.update(readFileSync('public/' + file));
const template = readFileSync('scripts/sw-template.js', 'utf8'); hash.update(template);
writeFileSync('public/sw.js', template.replace('__FULLVIEW_CACHE_VERSION__', hash.digest('hex').slice(0, 14)));
console.log(`Prepared offline catalogue: ${catalogue.services.length} services, ${catalogue.audiences.length} pathways.`);
