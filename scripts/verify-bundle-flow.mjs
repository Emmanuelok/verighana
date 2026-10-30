import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';

async function moduleAt(path) {
  const {outputFiles} = await build({entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
  return import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
}
const [catalog, bundles, handoff, desk, inquiry, pdf] = await Promise.all([
  'lib/catalog.ts', 'lib/service-bundles.ts', 'lib/bundle-handoff.ts', 'lib/local-briefs.ts', 'lib/inquiry-summary.ts', 'lib/estimate-pdf.ts',
].map(moduleAt));
const memory = new Map();
const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value)};
for (const bundle of bundles.serviceBundles) {
  for (const audience of bundle.audiences) {
    const addOns = bundle.addOns.map(item => ({id: item.serviceId, quantity: item.maxQuantity}));
    const request = {bundleId: bundle.id, audience, addOns};
    const url = handoff.bundleDeskUrl(request);
    assert.ok(url.startsWith('/workspace?'));
    assert.deepEqual(handoff.parseBundleRequest(new URL(url, 'https://example.test').search), request);
    const draft = handoff.bundleBriefDraft(request);
    const quote = bundles.quoteBundle(bundle.id, audience, addOns);
    assert.equal(catalog.estimateTotal(draft.selections, audience), quote.total);
    assert.ok(draft.description.length <= 6000, 'Package scope must fit the brief');
    const brief = desk.saveLocalBrief(storage, {name: 'Local Test', email: 'test@example.org', organisation: '',
      title: draft.title, description: draft.description, deadline: '2099-01-01', budget: 'Please advise', audience, selections: draft.selections, packageRequest: request});
    assert.equal(brief.estimate, quote.total);
    assert.throws(() => desk.validateBrief({...brief, selections: draft.selections.slice(1)}), 'Package quantities must not silently diverge');
    assert.equal(desk.getBriefPricing(brief).total, quote.total);
    const summary = inquiry.inquirySummary(brief);
    assert.ok(summary.includes(bundle.revisionPolicy));
    assert.ok(summary.includes(bundle.exclusions[0]));
    assert.ok(summary.includes('No booking, accepted quote or payment commitment'));
    assert.ok(brief.description.includes('PACKAGE SCOPE'));
    assert.ok(!brief.description.includes('owner approval'));
  }
}
assert.equal(handoff.parseBundleRequest(''), null);
assert.throws(() => desk.readLocalDraft({getItem: () => '{broken'}));
assert.throws(() => desk.readLocalDraft({getItem: () => JSON.stringify({title:'invalid draft'})}));
for (const search of ['?bundle=missing&bundleAudience=masters', '?bundle=dissertation-quantitative&bundleAudience=business',
  '?bundle=dissertation-quantitative&bundleAudience=masters&bundleAddons=broken',
  '?bundle=dissertation-quantitative&bundleAudience=masters&bundleAddons=' + encodeURIComponent('[{"id":"statistics-training","quantity":0.5}]')]) {
  assert.throws(() => handoff.parseBundleRequest(search));
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async path => new Response(readFileSync('public' + path));
try {
  const bundle = bundles.getBundle('dissertation-quantitative');
  const quote = bundles.quoteBundle(bundle.id, 'masters', bundle.addOns.map(item => ({id: item.serviceId, quantity: item.maxQuantity})));
  const bytes = await pdf.createEstimatePdf({pathway: 'Master’s student', items: quote.lines.map(line => ({...line, deliverables: [line.scope, ...line.deliverables]})),
    packageProposal: {title: bundle.title, notes: [bundle.timeline, bundle.revisionPolicy, ...bundle.exclusions, bundles.bundlePricingNotice, bundles.bundleAuthorshipNotice]}});
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() >= 3, 'Long bundle proposal should paginate');
  assert.match(document.getTitle(), /Package estimate/);
  mkdirSync('work/verification', {recursive: true});
  writeFileSync('work/verification/dissertation-bundle-proposal.pdf', bytes);
} finally {globalThis.fetch = originalFetch;}
console.log('PASS: all bundle pathways carry exact totals, approved scope and engagement terms through handoff, saved brief, inquiry and multipage PDF; invalid links rejected.');
