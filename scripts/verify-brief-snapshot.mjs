import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

// Bundle both exports together so changing the catalogue simulates a later release.
const { outputFiles } = await build({
  stdin: { contents: "export * from './lib/local-briefs'; export {services, rate} from './lib/catalog'; export {createBriefPdf} from './lib/brief-pdf';", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const desk = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const memory = new Map();
const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const input = {
  name: 'Test Researcher', email: 'researcher@example.org', organisation: 'Example institution', audience: 'phd',
  title: 'Snapshot regression example', description: 'A saved planning brief should preserve its historical quantities, scope and indicative rates.',
  deadline: desk.localDate(tomorrow), budget: 'Please advise', selections: [{ id: 'quantitative', quantity: 2 }],
};
const saved = desk.saveLocalBrief(storage, { ...input, priceSnapshot: { lines: [{ unitPrice: 1 }] } });
assert.equal(saved.estimate, 5040, 'Saving must use catalogue prices, never caller-supplied prices');
assert.equal(saved.priceSnapshot.currency, 'GHS');
assert.equal(saved.priceSnapshot.version, 1);
assert.equal(saved.priceSnapshot.capturedAt, saved.createdAt);
assert.equal(saved.priceSnapshot.lines[0].unitPrice, 2520);
const savedRaw = JSON.parse(memory.get(desk.BRIEFS_KEY));
assert.ok(savedRaw[0].priceSnapshot);
assert.equal(savedRaw[0].details.priceSnapshot, undefined, 'Snapshot belongs to the stored record, not project details');

const legacy = { id: 'FVS-0123456789ABCDEF', createdAt: saved.createdAt, details: input };
storage.setItem(desk.BRIEFS_KEY, JSON.stringify([...savedRaw, legacy]));
const service = desk.services.find(item => item.id === 'quantitative');
const original = { price: service.price, title: service.title, unit: service.unit, deliverables: [...service.deliverables] };
const originalFetch = globalThis.fetch;
try {
  service.price = 2000;
  service.title = 'Renamed analysis service';
  service.unit = 'new scoped dataset';
  service.deliverables[0] = 'A revised service deliverable';
  const [reopened, oldBrief] = desk.readLocalBriefs(storage);
  assert.equal(reopened.estimate, 5040, 'Later catalogue pricing must not change saved snapshot totals');
  assert.equal(reopened.priceSnapshot.lines[0].title, original.title);
  assert.equal(reopened.priceSnapshot.lines[0].unit, original.unit);
  assert.deepEqual(reopened.priceSnapshot.lines[0].deliverables, original.deliverables, 'Snapshots must not share mutable catalogue arrays');
  assert.equal(desk.getBriefPricing(reopened).source, 'snapshot');
  assert.match(desk.getBriefPricing(reopened).notice, /Planning rates saved on/);
  assert.equal(oldBrief.estimate, 7200, 'Legacy briefs intentionally use current catalogue prices');
  assert.equal(oldBrief.priceSnapshot, undefined);
  assert.match(desk.getBriefPricing(oldBrief).notice, /refreshed.*current catalogue.*may differ/);
  assert.match(desk.getBriefPricing({ ...oldBrief, id: 'UNSAVED DRAFT' }).notice, /Draft estimate/);
  assert.equal(desk.getBriefPricing({ ...reopened, estimate: 1 }).total, 5040, 'Display/PDF total is derived from its actual snapshot lines');

  // Retired services remain exportable when the saved record has a valid snapshot.
  const index = desk.services.indexOf(service);
  desk.services.splice(index, 1);
  storage.setItem(desk.BRIEFS_KEY, JSON.stringify(savedRaw));
  try {
    assert.equal(desk.readLocalBriefs(storage)[0].estimate, 5040);
    globalThis.fetch = async path => new Response(readFileSync('public' + path));
    const pdf = await desk.createBriefPdf({ ...reopened, estimate: 1 });
    assert.equal(Buffer.from(pdf).subarray(0, 5).toString(), '%PDF-');
    assert.ok((await PDFDocument.load(pdf)).getPageCount() > 0);
  } finally { desk.services.splice(index, 0, service); }

  for (const alter of [
    record => { record.priceSnapshot.lines[0].quantity = 3; },
    record => { record.priceSnapshot.lines[0].unitPrice = -1; },
    record => { record.priceSnapshot.lines[0].id = 'wrong-service'; },
    record => { record.priceSnapshot.currency = 'USD'; },
    record => { record.priceSnapshot.version = 2; },
    record => { record.priceSnapshot.capturedAt = 'invalid'; },
  ]) {
    const damaged = structuredClone(savedRaw); alter(damaged[0]);
    storage.setItem(desk.BRIEFS_KEY, JSON.stringify(damaged));
    assert.throws(() => desk.readLocalBriefs(storage), 'Invalid saved snapshots must not silently reprice');
    assert.throws(() => desk.saveLocalBrief(storage, input), 'Saving must preserve unreadable existing records');
    assert.equal(memory.get(desk.BRIEFS_KEY), JSON.stringify(damaged));
  }

  storage.setItem(desk.BRIEFS_KEY, JSON.stringify([...savedRaw, legacy]));
  const next = desk.saveLocalBrief(storage, input);
  assert.equal(next.estimate, 7200, 'A new brief captures the updated catalogue');
  desk.removeLocalBrief(storage, next.id);
  const persisted = JSON.parse(memory.get(desk.BRIEFS_KEY));
  assert.deepEqual(persisted[0].priceSnapshot, savedRaw[0].priceSnapshot, 'Other saves/deletes must preserve older snapshots');
  assert.equal(persisted[1].priceSnapshot, undefined, 'Legacy records must not be silently stamped with new prices');
  const custom = desk.saveLocalBrief(storage, { ...input, selections: [] });
  assert.deepEqual(custom.priceSnapshot.lines, []);
  assert.equal(custom.estimate, 0);
} finally {
  Object.assign(service, original);
  globalThis.fetch = originalFetch;
}
console.log('PASS: saved price/scope snapshots, catalogue changes and retirement, legacy refresh disclosure, PDF export, invalid-record preservation and custom scopes.');
