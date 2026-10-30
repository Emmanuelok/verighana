import assert from 'node:assert/strict';
import {build} from 'esbuild';

async function loadModule(entry) {
  const {outputFiles} = await build({entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
  return import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
}
const {serviceBundles, quoteBundle, bundleScopeSummary, bundlePricingNotice, bundleAuthorshipNotice} = await loadModule('lib/service-bundles.ts');
const {services, rate} = await loadModule('lib/catalog.ts');
const expected = {
  'dissertation-proposal': 5340,
  'dissertation-quantitative': 10850,
  'dissertation-qualitative': 10440,
  'journal-readiness': 12600,
  'business-evidence': 15000,
  'policy-decision': 16500,
  'institutional-measurement': 16000,
  'ngo-funding-evidence': 21000,
  'school-improvement': 11500,
};
assert.equal(serviceBundles.length, 9);
assert.equal(new Set(serviceBundles.map(bundle => bundle.id)).size, 9);
let validConfigurations = 0;
for (const bundle of serviceBundles) {
  assert.equal(quoteBundle(bundle.id, bundle.defaultAudience).total, expected[bundle.id], `${bundle.id} default total`);
  assert.ok(bundle.audiences.includes(bundle.defaultAudience));
  assert.ok(bundle.revisionPolicy.includes('14 calendar days'));
  assert.ok(bundle.exclusions.length >= 3);
  assert.ok(bundle.prerequisites.length >= 2);
  assert.ok(bundle.timeline.startsWith('Proposed'));
  assert.equal(new Set(bundle.items.map(item => item.id)).size, bundle.items.length);
  assert.equal(new Set(bundle.addOns.map(item => item.serviceId)).size, bundle.addOns.length);
  for (const audience of bundle.audiences) {
    const quote = quoteBundle(bundle.id, audience);
    const expectedBase = bundle.items.reduce((sum, item) => {
      const service = services.find(candidate => candidate.id === item.id);
      assert.ok(service.audiences.includes(audience), `${bundle.id}: ${item.id} audience`);
      return sum + rate(service, audience) * item.quantity;
    }, 0);
    assert.equal(quote.status, 'draft');
    assert.equal(quote.currency, 'GHS');
    assert.equal(quote.total, expectedBase);
    assert.equal(quote.addOnTotal, 0);
    const maxAddOns = bundle.addOns.map(addOn => ({id: addOn.serviceId, quantity: addOn.maxQuantity}));
    const expanded = quoteBundle(bundle.id, audience, maxAddOns);
    assert.equal(new Set(expanded.lines.map(line => line.id)).size, expanded.lines.length, 'No duplicate service rows in handoff');
    assert.ok(expanded.lines.length <= 12, 'Respect the existing handoff selection limit');
    assert.equal(expanded.total, expanded.lines.reduce((sum, line) => sum + line.total, 0));
    assert.equal(expanded.baseTotal, expectedBase);
    const summary = bundleScopeSummary(bundle.id, audience, maxAddOns);
    assert.ok(summary.includes(`total: GHS ${expanded.total}`));
    assert.ok(summary.includes(bundlePricingNotice));
    assert.ok(summary.includes(bundleAuthorshipNotice));
    assert.ok(summary.includes(bundle.revisionPolicy));
    for (const addOn of bundle.addOns) {
      assert.ok(!bundle.items.some(item => item.id === addOn.serviceId));
      assert.throws(() => quoteBundle(bundle.id, audience, [{id: addOn.serviceId, quantity: addOn.maxQuantity + 1}]));
      for (const quantity of [0, -1, 1.5, NaN, Infinity, '1']) {
        assert.throws(() => quoteBundle(bundle.id, audience, [{id: addOn.serviceId, quantity}]));
      }
      assert.throws(() => quoteBundle(bundle.id, audience, [{id: addOn.serviceId, quantity: 1}, {id: addOn.serviceId, quantity: 1}]));
    }
    assert.throws(() => quoteBundle(bundle.id, audience, [{id: 'not-in-catalogue', quantity: 1}]));
    assert.throws(() => quoteBundle(bundle.id, audience, [{id: bundle.items[0].id, quantity: 1}]));
    assert.throws(() => quoteBundle(bundle.id, audience, [null]));
    validConfigurations += 2;
  }
}
assert.throws(() => quoteBundle('no-such-bundle', 'masters'));
assert.throws(() => quoteBundle('journal-readiness', 'undergraduate'));
assert.throws(() => quoteBundle('dissertation-proposal', 'government'));
assert.throws(() => quoteBundle('dissertation-proposal', 'masters', null));
assert.equal(quoteBundle('dissertation-qualitative', 'masters', [{id:'transcription', quantity:60}]).addOnTotal, 900, 'Fixed per-minute price must not receive an academic multiplier');
console.log(JSON.stringify({result: 'PASS', bundles: serviceBundles.length, validConfigurations, proposedDefaultPricesGHS: expected}, null, 2));
