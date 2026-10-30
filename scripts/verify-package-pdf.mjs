import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {PDFDocument} from 'pdf-lib';

async function moduleAt(path) {
  const {outputFiles} = await build({entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
  return import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
}

const [packages, helpers, route] = await Promise.all([
  'lib/service-bundles.ts', 'lib/package-pdf.ts', 'app/api/package-pdf/route.ts',
].map(moduleAt));
let configurations = 0;
for (const bundle of packages.serviceBundles) {
  for (const audience of bundle.audiences) {
    for (const addOns of [[], bundle.addOns.map(item => ({id: item.serviceId, quantity: item.maxQuantity}))]) {
      const config = {bundleId: bundle.id, audience, addOns};
      const url = new URL(helpers.packagePdfUrl(config), 'https://example.test');
      assert.equal(url.pathname, '/api/package-pdf');
      assert.deepEqual([...url.searchParams.keys()].sort(), ['addOns', 'audience', 'bundleId']);
      assert.deepEqual(helpers.parsePackagePdfConfig(url.searchParams), config);
      const document = helpers.packagePdfDocument(config);
      const quote = packages.quoteBundle(bundle.id, audience, addOns);
      assert.equal(document.items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), quote.total);
      assert.equal(document.packageProposal.title, bundle.title);
      for (const text of [bundle.revisionPolicy, ...bundle.exclusions, packages.bundlePricingNotice, packages.bundleAuthorshipNotice]) {
        assert.ok(document.packageProposal.notes.some(note => note.includes(text)));
      }
      configurations++;
    }
  }
}

const base = 'https://example.test/api/package-pdf?bundleId=dissertation-quantitative&audience=masters';
const invalid = [
  '', '?bundleId=missing&audience=masters', '?bundleId=journal-readiness&audience=undergraduate',
  '?bundleId=../private&audience=masters', '?bundleId=dissertation-quantitative&audience=unknown',
  '?bundleId=dissertation-quantitative&audience=masters&audience=phd',
  '?bundleId=dissertation-quantitative&audience=masters&bundleId=school-improvement',
  '?bundleId=dissertation-quantitative&audience=masters&addOns=[]&addOns=[]',
  '?bundleId=dissertation-quantitative&audience=masters&addOns=broken',
  '?bundleId=dissertation-quantitative&audience=masters&addOns=' + 'x'.repeat(3001),
];
for (const key of ['name','email','organisation','title','description','deadline','budget','estimate','unitPrice','total','file','upload','briefId']) {
  invalid.push(new URL(base).search + '&' + key + '=not-accepted');
}
for (const addOns of [null, {}, [null], [[]], [{id:'statistics-training',quantity:'1'}],
  [{id:'statistics-training',quantity:0}], [{id:'statistics-training',quantity:-1}],
  [{id:'statistics-training',quantity:0.5}], [{id:'statistics-training',quantity:3}],
  [{id:'statistics-training',quantity:1,description:'private text'}],
  [{id:'statistics-training',quantity:1,unitPrice:1}],
  [{id:'missing',quantity:1}], [{id:'quantitative',quantity:1}],
  [{id:'statistics-training',quantity:1},{id:'statistics-training',quantity:1}]]) {
  invalid.push(new URL(base).search + '&addOns=' + encodeURIComponent(JSON.stringify(addOns)));
}
for (const search of invalid) {
  const response = await route.GET(new Request('https://example.test/api/package-pdf' + search));
  assert.equal(response.status, 400, search.slice(0, 140));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
}
for (const headers of [{'content-length':'1'}, {'transfer-encoding':'chunked'}]) {
  assert.equal((await route.GET(new Request(base, {headers}))).status, 400);
}
assert.equal((await route.GET({url:base, headers:new Headers(), body:new ReadableStream()})).status, 400);
for (const method of ['POST','PUT','PATCH','DELETE','HEAD']) {
  const response = route[method]();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
}

const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Public package generation must use bundled assets, not network requests.'); };
try {
  const bundle = packages.getBundle('dissertation-quantitative');
  const config = {bundleId:bundle.id, audience:'masters', addOns:bundle.addOns.map(item => ({id:item.serviceId,quantity:item.maxQuantity}))};
  const response = await route.GET(new Request(new URL(helpers.packagePdfUrl(config), 'https://example.test')));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/pdf');
  assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="Fullview-Signature-dissertation-quantitative-package.pdf"');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  const pdf = await PDFDocument.load(bytes);
  assert.match(pdf.getTitle(), /^Package estimate/);
  assert.ok(pdf.getPageCount() >= 3);
  const cwd = process.cwd();
  try {
    process.chdir('/tmp');
    const failed = await route.GET(new Request(base));
    assert.equal(failed.status, 500);
    assert.equal(failed.headers.get('Cache-Control'), 'no-store');
    assert.ok(!(await failed.text()).includes('/tmp'));
  } finally { process.chdir(cwd); }
  console.log(JSON.stringify({result:'PASS', configurations, invalidConfigurations:invalid.length, pdfBytes:bytes.length, pdfPages:pdf.getPageCount(), privateBriefFlow:'unchanged; browser save not verified'}, null, 2));
} finally {globalThis.fetch = originalFetch;}
