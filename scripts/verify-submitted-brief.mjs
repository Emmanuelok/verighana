import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

async function load(entry, plugins = []) {
  const result = await build({entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', plugins, logLevel: 'silent'});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {submittedBriefSummary} = await load('lib/submitted-brief.ts');
const {SubmittedBrief} = await load('components/submitted-brief.tsx');
const render = brief => renderToStaticMarkup(createElement(SubmittedBrief, {brief, description: 'Fallback description', expiresAt: '2099-01-01T00:00:00.000Z'}));
const fixture = {
  title: 'Synthetic custom analysis request', name: 'Synthetic Client', email: 'synthetic@example.org', organisation: 'Synthetic Institution',
  description: 'A saved custom research question. Only the stated original material is included.', audience: 'masters', deadline: '2098-01-01', budget: 'Please advise',
  selections: [{id: 'quantitative', quantity: 7}], packageRequest: null, estimate: 2250.15,
  priceSnapshot: {version: 1, currency: 'GHS', capturedAt: '2026-01-02T00:00:00.000Z', lines: [
    {id: 'quantitative', title: 'Archived quantitative service', quantity: 7, unit: 'archived analysis unit', unitPrice: 321.45, deliverables: ['Original saved deliverable']},
  ]},
};
function freeze(value) {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;}
freeze(fixture);
const before = JSON.stringify(fixture);
const saved = submittedBriefSummary(fixture);
assert.equal(saved.pathway, 'Master’s student');
assert.equal(saved.pricing.status, 'saved');
assert.equal(saved.pricing.total.toFixed(2), '2250.15');
assert.equal(saved.pricing.warning, null);
const html = render(fixture);
for (const visible of ['Submitted title', fixture.title, fixture.name, fixture.email, fixture.organisation, fixture.description,
  'Master’s student', fixture.deadline, fixture.budget, 'Archived quantitative service', 'archived analysis unit',
  'Original saved deliverable', '<td>7</td>', 'GHS 321.45', 'GHS 2,250.15', '2 Jan 2026', 'UTC', 'not an accepted quote']) assert.ok(html.includes(visible), visible);
assert.equal(JSON.stringify(fixture), before, 'Rendering must not mutate submitted records');

// A changed or retired current catalogue must never reprice or relabel the saved snapshot.
const changedCatalogue = {
  name: 'changed-catalogue', setup(builder) {
    builder.onResolve({filter: /(^|\/)catalog$/}, () => ({path: 'catalog', namespace: 'changed-catalogue'}));
    builder.onLoad({filter: /.*/, namespace: 'changed-catalogue'}, () => ({loader: 'js', contents: `
      export const audiences=[{id:'masters',label:'Master’s student'}];
      export const services=[];
      export function rate(){throw Error('Historical records must not be repriced');}
    `}));
  },
};
const historical = await load('lib/submitted-brief.ts', [changedCatalogue]);
assert.deepEqual(historical.submittedBriefSummary(fixture).pricing, saved.pricing);
const historicalView = await load('components/submitted-brief.tsx', [changedCatalogue]);
assert.equal(renderToStaticMarkup(createElement(historicalView.SubmittedBrief, {brief: fixture, description: 'Fallback description', expiresAt: '2099-01-01T00:00:00.000Z'})), html);

const legacy = structuredClone(fixture); delete legacy.priceSnapshot;
const legacyView = render(legacy);
assert.equal(submittedBriefSummary(legacy).pricing.status, 'missing');
assert.ok(legacyView.includes('quantitative — quantity 7'));
assert.ok(legacyView.includes('Recorded planning total:'));
assert.ok(legacyView.includes('GHS 2,250.15'));
assert.ok(legacyView.includes('current catalogue prices have not been applied'));
assert.ok(!legacyView.includes('Archived quantitative service'));
assert.ok(!legacyView.includes('GHS 321.45'));
delete legacy.estimate;
assert.ok(!render(legacy).includes('Recorded planning total:'));

for (const change of [
  brief => {brief.priceSnapshot.lines[0].unitPrice = '321.45';},
  brief => {brief.priceSnapshot.lines[0].unitPrice = Number.NaN;},
  brief => {brief.priceSnapshot.lines[0].quantity = 6;},
  brief => {brief.priceSnapshot.lines.push({...brief.priceSnapshot.lines[0]});},
  brief => {brief.priceSnapshot.currency = 'USD';},
  brief => {brief.priceSnapshot.version = 2;},
  brief => {brief.priceSnapshot.capturedAt = 'invalid';},
  brief => {delete brief.selections;},
  brief => {brief.selections[0].quantity = 1.5;},
]) {
  const invalid = structuredClone(fixture); change(invalid);
  assert.equal(submittedBriefSummary(invalid).pricing.status, 'invalid');
  const invalidView = render(invalid);
  assert.ok(invalidView.includes('could not be verified'));
  assert.ok(!invalidView.includes('GHS 321.45'));
  assert.ok(!invalidView.includes('GHS 2,250.15'));
}
const inconsistentTotal = {...fixture, estimate: 1};
assert.ok(render(inconsistentTotal).includes('recorded summary total differs'));
assert.ok(render(inconsistentTotal).includes('Saved planning total: GHS 2,250.15'));

const bundle = structuredClone(fixture);
bundle.title = 'Saved dissertation package';
bundle.description = 'Saved package scope: one original dataset. Excludes new data collection. One correction round within 14 days.';
bundle.packageRequest = {bundleId: 'dissertation-quantitative', audience: 'masters', addOns: [{id: 'statistics-training', quantity: 2}]};
bundle.selections.push({id: 'statistics-training', quantity: 2});
bundle.priceSnapshot.lines.push({id: 'statistics-training', title: 'Archived software training', quantity: 2, unit: 'saved two-hour session', unitPrice: 88, deliverables: ['Saved session materials']});
bundle.estimate += 176;
const bundleView = render(bundle);
for (const visible of ['Saved package selection', 'dissertation-quantitative', 'Selected optional extras', 'Archived software training — quantity 2', 'Saved session materials', bundle.description, 'GHS 2,426.15']) assert.ok(bundleView.includes(visible), visible);
bundle.packageRequest.audience = 'phd';
assert.ok(render(bundle).includes('saved package selection could not be verified'));

const empty = {...fixture, selections: [], estimate: 0, priceSnapshot: {...fixture.priceSnapshot, lines: []}};
assert.ok(render(empty).includes('No services were selected. Pricing remains to be scoped.'));
assert.ok(!render(empty).includes('Saved planning total: GHS 0'));
const escaped = structuredClone(fixture); escaped.priceSnapshot.lines[0].title = '<script>synthetic</script>';
assert.ok(!render(escaped).includes('<script>synthetic</script>'));
assert.ok(render(escaped).includes('&lt;script&gt;synthetic&lt;/script&gt;'));
assert.equal(submittedBriefSummary(null).pricing.status, 'missing');
assert.ok(readFileSync('components/operations-dashboard.tsx', 'utf8').includes('<SubmittedBrief brief={detail.brief} description={detail.description} expiresAt={detail.expires_at}/>'));
console.log('PASS: submitted custom and package scopes show stored pathways, quantities, rates, deliverables and dates; catalogue changes never reprice; legacy/malformed records remain explicit; no remote data or provider used.');
