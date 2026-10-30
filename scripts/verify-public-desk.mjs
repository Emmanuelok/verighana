import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

async function loadModule(path) {
  const { outputFiles } = await build({ entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
}
const desk = await loadModule('lib/local-briefs.ts');
const memory = new Map();
const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const input = { name: 'Test Researcher', email: 'researcher@example.org', organisation: 'Example institution', audience: 'phd',
  title: 'Public desk regression example', description: 'An anonymous visitor can prepare, save, reopen and export this research brief without an account.',
  deadline: desk.localDate(tomorrow), budget: 'Please advise', selections: [{ id: 'quantitative', quantity: 2 }] };
const first = desk.saveLocalBrief(storage, input);
assert.equal(first.estimate, 5040);
assert.equal(desk.readLocalBriefs(storage)[0].id, first.id);
const second = desk.saveLocalBrief(storage, { ...input, title: 'A second independent research brief' });
assert.deepEqual(desk.readLocalBriefs(storage).map(item => item.id), [second.id, first.id]);
assert.deepEqual(desk.removeLocalBrief(storage, first.id).map(item => item.id), [second.id]);
assert.equal(desk.readLocalBriefs({ getItem: () => null }).length, 0, 'Another browser must not see this browser’s briefs');
for (const invalid of [
  { ...input, deadline: '2020-01-01' }, { ...input, deadline: '2099-02-31' },
  { ...input, selections: [{ id: 'government-procurement', quantity: 1 }] },
  { ...input, selections: [{ id: 'quantitative', quantity: 501 }] },
  { ...input, selections: [...input.selections, ...input.selections] },
]) assert.throws(() => desk.saveLocalBrief(storage, invalid));
assert.equal(desk.readLocalBriefs(storage).length, 1, 'Invalid submissions must leave saved briefs unchanged');
const before = memory.get(desk.BRIEFS_KEY);
assert.throws(() => desk.saveLocalBrief({ getItem: storage.getItem, setItem: () => { throw Error('Storage full'); } }, input));
assert.equal(memory.get(desk.BRIEFS_KEY), before, 'A failed write must not erase previous work');
assert.throws(() => desk.saveLocalBrief({ getItem: () => 'broken JSON', setItem: () => assert.fail('Must not overwrite unreadable data') }, input));
storage.setItem(desk.DRAFT_KEY, JSON.stringify({ ...desk.emptyForm, title: 'Recovered draft title' }));
assert.equal(desk.readLocalDraft(storage).title, 'Recovered draft title');

const originalFetch = globalThis.fetch;
globalThis.fetch = async path => new Response(readFileSync('public' + path));
try {
  const estimates = await loadModule('lib/estimate-pdf.ts');
  const briefs = await loadModule('lib/brief-pdf.ts');
  mkdirSync('work/verification', { recursive: true });
  const estimate = await estimates.createEstimatePdf({ pathway: 'Doctoral research', items: [{ title: 'Quantitative analysis', quantity: 2, unit: 'dataset', unitPrice: 2520, days: '5–10 working days', deliverables: ['Analysis plan', 'Validated results'] }] });
  const longBrief = { ...second, description: ('Research questions, methods and evidence. ' + 'LongUnbrokenTerm'.repeat(12) + '\n').repeat(24) };
  const brief = await briefs.createBriefPdf(longBrief);
  assert.equal(Buffer.from(estimate).subarray(0, 5).toString(), '%PDF-');
  assert.equal(Buffer.from(brief).subarray(0, 5).toString(), '%PDF-');
  const estimateDoc = await PDFDocument.load(estimate);
  const briefDoc = await PDFDocument.load(brief);
  assert.equal(estimateDoc.getPageCount(), 1);
  assert.ok(briefDoc.getPageCount() >= 3, 'Long research descriptions must paginate');
  assert.match(estimateDoc.getTitle(), /Veridanth Group/);
  writeFileSync('work/verification/estimate.pdf', estimate);
  writeFileSync('work/verification/long-brief.pdf', brief);
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: anonymous brief lifecycle, browser isolation, validation, draft recovery, storage failure preservation and multipage PDF exports.');
