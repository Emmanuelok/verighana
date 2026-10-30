import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function loadModule(path) {
  const { outputFiles } = await build({ entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
}
const { isEstimateQuantity, normalizeEstimate, updateEstimateQuantity } = await loadModule('lib/estimate-selection.ts');
const { estimateTotal } = await loadModule('lib/catalog.ts');
const { parseEstimateTransfer, researchDeskUrl } = await loadModule('lib/estimate-transfer.ts');

const items = [{ id: 'quantitative', quantity: 2 }];
for (const invalid of [0, -1, 0.5, 1.5, 501, Infinity, NaN, '2', null, undefined]) {
  assert.equal(isEstimateQuantity(invalid), false);
  assert.strictEqual(updateEstimateQuantity(items, 'quantitative', invalid), items, 'Invalid quantities must preserve the estimate');
}
for (const valid of [1, 2, 500]) assert.equal(isEstimateQuantity(valid), true);
assert.equal(updateEstimateQuantity(items, 'quantitative', 500)[0].quantity, 500);
assert.equal(items[0].quantity, 2, 'Quantity edits must not mutate previous selections');
assert.equal(normalizeEstimate(null), null);
assert.equal(normalizeEstimate({ audience: 'invented', items }), null);
assert.equal(normalizeEstimate({ audience: 'phd', items: null }), null);
const restored = normalizeEstimate({ audience: 'phd', items: [
  ...items, ...items, null, {}, { id: 'quantitative', quantity: 3 },
  { id: 'academic-edit', quantity: 1.5 }, { id: 'references', quantity: 501 },
  { id: 'government-procurement', quantity: 1 }, { id: 'missing', quantity: 1 },
  { id: 'research-consultation', quantity: 1 },
] });
assert.equal(restored.repaired, true);
assert.deepEqual(restored.items, [...items, { id: 'research-consultation', quantity: 1 }]);
assert.equal(normalizeEstimate({ audience: 'phd', items }).repaired, false);
const transfer = new URL(researchDeskUrl('phd', items));
assert.deepEqual(parseEstimateTransfer(transfer.hash), { audience: 'phd', items });
assert.equal(estimateTotal(parseEstimateTransfer(transfer.hash).items, 'phd'), 5040, 'Transfer and estimator must retain the same total without browser storage');
console.log('PASS: integer bounds, non-mutating rejection, saved estimate sanitisation, deduplication, pathway eligibility and storage-independent transfer totals.');
