import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import sharp from 'sharp';

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
assert.equal(manifest.name, 'Fullview Signature — by Avalon Group');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.scope, '/');
assert.equal(manifest.id, '/');
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
for (const icon of manifest.icons) {
  const image = await sharp('public' + new URL(icon.src, 'https://fvsignature.com').pathname).metadata();
  assert.equal(`${image.width}x${image.height}`, icon.sizes);
}
const og = await sharp('public/brand/og-fullview-signature.png').metadata();
assert.equal(og.width, 1200); assert.equal(og.height, 630);
const apple = await sharp('public/brand/apple-touch-icon.png').metadata();
assert.equal(apple.width, 180); assert.equal(apple.height, 180);

const catalogue = JSON.parse(readFileSync('public/offline-catalogue.json', 'utf8'));
assert.equal(catalogue.services.length, 100);
assert.equal(new Set(catalogue.services.map(item => item.id)).size, 100);
assert.equal(catalogue.services.find(item => item.id === 'quantitative').prices.phd, 2520);
assert.ok(catalogue.services.every(item => item.audiences.every(audience => Number.isFinite(item.prices[audience]))));

const handlers = new Map(); const databases = new Map(); const origin = 'https://fullview.example';
let refuseWrites = false;
const key = value => typeof value === 'string' ? new URL(value, origin).href : value.url;
const store = name => {
  if (!databases.has(name)) databases.set(name, new Map());
  const rows = databases.get(name);
  return { addAll: async requests => { for (const request of requests) rows.set(key(request), new Response('offline catalogue')); }, match: async request => rows.get(key(request)), put: async (request, response) => { if(refuseWrites) throw Error('Cache full'); rows.set(key(request), response); }, keys: async () => Array.from(rows.keys()), delete: async request => rows.delete(key(request)) };
};
databases.set('another-app-cache', new Map()); databases.set('fullview-shell-outdated', new Map());
let offline = false;
const context = {
  self: { location: { origin }, addEventListener: (name, handler) => handlers.set(name, handler), clients: { claim: async () => {} }, skipWaiting: async () => {} },
  caches: { open: async name => store(name), keys: async () => Array.from(databases.keys()), delete: async name => databases.delete(name) },
  URL, Response, Request: class { constructor(url, options) { this.url = new URL(url, origin).href; Object.assign(this, options); } },
  fetch: async () => { if (offline) throw Error('offline'); const response = new Response('online'); Object.defineProperty(response, 'type', {value:'basic'}); return response; }, Promise,
};
vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), context);
let work; handlers.get('install')({ waitUntil: promise => { work = promise; } }); await work;
handlers.get('activate')({ waitUntil: promise => { work = promise; } }); await work;
assert.ok(databases.has('another-app-cache'), 'Other app caches must be preserved');
assert.ok(!databases.has('fullview-shell-outdated'), 'Old Fullview shell should be cleaned up');
for (const path of ['/api/briefs','/api/briefs?id=VRG-TEST','/workspace','/signin-with-chatgpt','/signout-with-chatgpt','/callback','/services?_rsc=1']) {
  let intercepted = false;
  handlers.get('fetch')({ request: { method: 'GET', url: origin + path, mode: 'navigate', headers: new Headers() }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false, `Never cache or intercept private route ${path}`);
}
offline = true;
let fallback;
handlers.get('fetch')({ request: { method: 'GET', url: origin + '/services', mode: 'navigate', headers: new Headers() }, respondWith: promise => { fallback = promise; } });
assert.equal(await (await fallback).text(), 'offline catalogue', 'Offline navigation must return the saved catalogue');
offline = false; refuseWrites = true;
let asset;
handlers.get('fetch')({request:{method:'GET',url:origin+'/brand/uncached.svg',mode:'cors',headers:new Headers()},respondWith:promise=>{asset=promise;}});
assert.equal(await (await asset).text(), 'online', 'Storage quota failure must preserve the network response');
console.log('PASS: brand assets, icon dimensions, 100 offline services, pricing parity, offline fallback and private-route cache exclusions.');
