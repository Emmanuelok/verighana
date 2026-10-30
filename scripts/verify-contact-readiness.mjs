import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

async function load(entry, plugins = []) {
  const result = await build({entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', plugins, logLevel: 'silent'});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {fullviewContact} = await load('lib/contact.ts');
assert.equal(fullviewContact.email, 'hello@fvsignature.com');
assert.equal(typeof fullviewContact.emailReady, 'boolean');
assert.equal(fullviewContact.emailHref, fullviewContact.emailReady ? 'mailto:hello@fvsignature.com' : undefined);
function contactFixture(ready) {
  const contact = {...fullviewContact, emailReady: ready, emailHref: ready ? 'mailto:hello@fvsignature.com' : undefined};
  return {name: `contact-readiness-${ready}`, setup(builder) {
    builder.onResolve({filter: /(^|\/)contact$/}, () => ({path: 'contact', namespace: 'contact-fixture'}));
    builder.onLoad({filter: /.*/, namespace: 'contact-fixture'}, () => ({loader: 'js', contents: `export const fullviewContact=${JSON.stringify(contact)};`}));
  }};
}
for (const ready of [false, true]) {
  const {ContactEmail} = await load('components/contact-email.tsx', [contactFixture(ready)]);
  for (const withPhone of [false, true]) {
    const markup = renderToStaticMarkup(createElement(ContactEmail, {withPhone}));
    assert.ok(markup.includes('hello@fvsignature.com'));
    if (ready) assert.ok(markup.includes('mailto:hello@fvsignature.com'));
    else {
      assert.ok(markup.includes('Email setup in progress; please call.'));
      assert.ok(!markup.includes('mailto:'), 'An unverified mailbox must not be actionable');
      if (withPhone) assert.ok(markup.includes('tel:+233209409668'));
    }
  }
}
for (const file of ['components/platform.tsx','components/inquiry-handoff.tsx','components/contact-form.tsx',
  'components/operations-dashboard.tsx','components/share-project.tsx','app/contact/page.tsx','app/account/page.tsx']) {
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes('ContactEmail'), `${file}: contact fallback should use readiness-aware rendering`);
  assert.ok(!source.includes('fullviewContact.emailHref') && !source.includes('mailto:'), `${file}: no bypass of mailbox readiness`);
}

// Simulate otherwise-ready infrastructure. The public gate must still reject before DB or mail work.
const infrastructure = {
  name: 'inquiry-readiness-fixture',
  setup(builder) {
    builder.onResolve({filter: /operations\/(database|email|http|inquiries|validation)$/}, args => ({path: args.path.split('/').at(-1), namespace: 'readiness-fixture'}));
    builder.onLoad({filter: /.*/, namespace: 'readiness-fixture'}, args => ({loader: 'js', contents: {
      database: 'export const databaseConfigured=()=>true; export function getDatabase(){throw Error("Database must not be reached");}',
      email: 'export const emailConfigured=()=>true; export function dispatchNotification(){throw Error("Email must not be reached");}',
      inquiries: 'export function submitInquiry(){throw Error("Submission must not be reached");}',
      validation: 'export const consentVersion="fullview-inquiry-v1"; export const retentionDays=()=>30;',
      http: 'export const privateHeaders={"Cache-Control":"private, no-store"}; export const readJson=request=>request.json(); export const clientAddress=()=>"127.0.0.1"; export async function respond(work,status=200){try{return Response.json(await work(),{status});}catch(error){return Response.json({error:error.message,code:error.code},{status:error.status||500});}}',
    }[args.path]}));
  },
};
const route = await load('app/api/inquiries/route.ts', [infrastructure, contactFixture(false)]);
const status = await (await route.GET()).json();
assert.equal(status.available, false);
assert.equal(status.recipient, 'hello@fvsignature.com');
const refused = await route.POST(new Request('https://fvsignature.com/api/inquiries', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'}));
assert.equal(refused.status, 503);
const message = await refused.json();
assert.equal(message.code, 'email_unavailable');
assert.ok(message.error.includes('+233 20 940 9668'));
console.log('PASS: pending address is visible without mailto links, public fallbacks offer verified telephone, and inquiry GET/POST stay closed even with otherwise-ready infrastructure. No database or email called.');
