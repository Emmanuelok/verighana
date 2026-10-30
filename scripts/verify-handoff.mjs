import assert from 'node:assert/strict';
import { build } from 'esbuild';

const { outputFiles } = await build({ entryPoints: ['lib/estimate-transfer.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { parseEstimateTransfer, researchDeskUrl } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const estimate = { audience: 'phd', items: [{ id: 'quantitative', quantity: 2 }] };
const url = new URL(researchDeskUrl(estimate.audience, estimate.items));
assert.equal(url.origin, 'https://fvsignature.com');
assert.equal(url.pathname, '/workspace');
assert.equal(url.search, '', 'Selections must not appear in server request logs');
assert.deepEqual(parseEstimateTransfer(url.hash), estimate);
assert.equal(new URL(researchDeskUrl('phd', [])).hash, '', 'An empty source estimate must not clear an existing desk estimate');
const hash = input => '#' + new URLSearchParams({ 'vrg-estimate': JSON.stringify(input) });
for (const bad of [
  { audience: 'administrator', items: [] },
  { audience: 'phd', items: [{ id: 'quantitative', quantity: 501 }] },
  { audience: 'phd', items: [{ id: 'quantitative', quantity: -1 }] },
  { audience: 'phd', items: [{ id: 'unknown', quantity: 1 }] },
  { audience: 'phd', items: [{ id: 'government-procurement', quantity: 1 }] },
  { audience: 'phd', items: [estimate.items[0], estimate.items[0]] },
]) assert.equal(parseEstimateTransfer(hash(bad)), null);
assert.equal(parseEstimateTransfer('#vrg-estimate=invalid'), null);
assert.equal(parseEstimateTransfer('#' + 'x'.repeat(6001)), null);
console.log('PASS: estimate handoff, destination, eligibility, duplicate detection, bounded input and quantities.');
