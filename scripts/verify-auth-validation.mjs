import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Local SDK boundary fixtures only: no accounts, credentials, provider requests, or emails.
const fixture = {calls: [], sessionCalls: [], session: {data: null, error: null}, response: null, responseStatus: 200, responseText: null, throw: false};
globalThis.__fullviewValidationFixture = fixture;
const plugin = {
  name: 'auth-validation-fixture',
  setup(builder) {
    builder.onResolve({filter: /^@neondatabase\/auth\/next\/server$/}, () => ({path: 'auth', namespace: 'fixture'}));
    builder.onResolve({filter: /^next\/server$/}, () => ({path: 'next', namespace: 'fixture'}));
    builder.onLoad({filter: /.*/, namespace: 'fixture'}, args => ({loader: 'js', contents: args.path === 'next' ? 'export class NextRequest extends Request {}' : `
      export function createNeonAuth(config) {
        const fixture = globalThis.__fullviewValidationFixture;
        fixture.config = config;
        async function proxy(request) {
          fixture.calls.push({method: request.method, url: request.url, body: await request.text(), headers: Object.fromEntries(request.headers)});
          if (fixture.throw) throw Error('synthetic provider failure');
          const headers = {'Set-Cookie': 'neon-auth.session_token=synthetic-only; HttpOnly; Secure; SameSite=Strict', 'X-Fixture': 'provider'};
          return fixture.responseText === null
            ? Response.json(fixture.response, {status: fixture.responseStatus, headers})
            : new Response(fixture.responseText, {status: fixture.responseStatus, headers});
        }
        return {
          async getSession(options) {fixture.sessionCalls.push(options); if(fixture.throw) throw Error('synthetic provider failure'); return fixture.session;},
          handler() {return {GET: proxy, POST: proxy};}
        };
      }`
    }));
  }
};
async function load(entry) {
  const result = await build({entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', plugins: [plugin], logLevel: 'silent'});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const keys = ['FULLVIEW_AUTH_ENABLED', 'FULLVIEW_AUTH_MODE', 'FULLVIEW_AUTH_TEST_EMAIL', 'FULLVIEW_NEON_AUTH_BASE_URL', 'FULLVIEW_AUTH_COOKIE_SECRET', 'FULLVIEW_APP_ORIGIN'];
const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const approved = 'hello@fvsignature.com';
const paths = ['sign-up/email', 'sign-in/email', 'email-otp/send-verification-otp', 'email-otp/verify-email', 'email-otp/request-password-reset', 'email-otp/reset-password'];
const links = ['request-password-reset', 'reset-password', 'send-verification-email'];
try {
  keys.forEach(key => delete process.env[key]);
  Object.assign(process.env, {
    FULLVIEW_AUTH_ENABLED: 'true', FULLVIEW_AUTH_MODE: 'validation', FULLVIEW_AUTH_TEST_EMAIL: ' Hello@FVSignature.com ',
    FULLVIEW_NEON_AUTH_BASE_URL: 'https://example.neonauth.neon.tech/project/auth',
    FULLVIEW_AUTH_COOKIE_SECRET: 'synthetic-fixture-only-never-a-live-secret', FULLVIEW_APP_ORIGIN: 'https://fvsignature.com',
  });
  const auth = await load('lib/fullview-auth.ts');
  const route = await load('app/api/auth/[...path]/route.ts');
  const invoke = (method, path, {body, email, origin = 'https://fvsignature.com', headers = {}, query = '', host = 'https://fvsignature.com'} = {}) => {
    const payload = body === undefined && method === 'POST' ? JSON.stringify({email, password: 'synthetic-fixture-only', otp: '000000', type: 'email-verification'}) : body;
    return route[method](new Request(`${host}/api/auth/${path}${query}`, {
      method, headers: {'Content-Type': 'application/json', ...(origin ? {Origin: origin} : {}), ...headers},
      ...(payload === undefined ? {} : {body: payload}),
    }), {params: Promise.resolve({path: path.split('/')})});
  };
  const rejectBeforeProvider = async (path, options, status = 403) => {
    const count = fixture.calls.length;
    const response = await invoke('POST', path, options);
    assert.equal(response.status, status);
    assert.equal(fixture.calls.length, count, `Rejected ${path} must not invoke the provider`);
    assert.equal(response.headers.get('cache-control')?.includes('no-store'), true);
    const text = await response.text();
    assert.equal(text.includes(approved), false, 'Denial must not expose the configured test address');
    assert.equal(text.includes('synthetic-fixture-only'), false);
  };

  assert.equal(auth.authenticationConfigured(), true);
  assert.equal(auth.authenticationMode(), 'validation');
  for (const mode of [undefined, '', 'Public', 'public ', 'disabled']) {
    if (mode === undefined) delete process.env.FULLVIEW_AUTH_MODE; else process.env.FULLVIEW_AUTH_MODE = mode;
    assert.equal(auth.authenticationConfigured(), false);
    const count = fixture.sessionCalls.length;
    await assert.rejects(auth.getPrincipal(), error => error.status === 503);
    assert.equal(fixture.sessionCalls.length, count);
    await rejectBeforeProvider('sign-in/email', {email: approved}, 503);
    const proxyCount = fixture.calls.length;
    assert.equal((await invoke('GET', 'get-session')).status, 503);
    assert.equal(fixture.calls.length, proxyCount);
  }
  process.env.FULLVIEW_AUTH_MODE = 'validation';
  for (const email of [undefined, '', ' ', 'not-an-email', 'hello@fvsignature.com,other@example.org', 'Fullview <hello@fvsignature.com>', 'hello@fvsignature.com\r\nBcc:other@example.org']) {
    if (email === undefined) delete process.env.FULLVIEW_AUTH_TEST_EMAIL; else process.env.FULLVIEW_AUTH_TEST_EMAIL = email;
    assert.equal(auth.authenticationConfigured(), false);
    await rejectBeforeProvider('sign-up/email', {email: approved}, 503);
  }
  process.env.FULLVIEW_AUTH_TEST_EMAIL = approved;
  fixture.response = {ok: true};
  for (const path of paths) {
    for (const email of ['other@example.org', 'hello+test@fvsignature.com', 'hello@fvsignature.com.evil.example', 'hello@evilfvsignature.com', '', undefined, null, [approved], {email: approved}]) {
      await rejectBeforeProvider(path, {email});
    }
    const count = fixture.calls.length;
    assert.equal((await invoke('POST', path, {email: ' Hello@FVSIGNATURE.COM '})).status, 200);
    assert.equal(fixture.calls.length, count + 1);
    assert.equal(JSON.parse(fixture.calls.at(-1).body).email, approved);
  }
  for (const body of ['{', 'null', '[]', JSON.stringify(approved), '{}', '{"email":"hello@fvsignature.com","email":"other@example.org"}']) await rejectBeforeProvider('sign-up/email', {body});
  await rejectBeforeProvider('sign-up/email', {email: approved, headers: {'content-type': 'text/plain'}});
  for (const path of links) await rejectBeforeProvider(path, {email: approved}, 404);
  const signoutCount = fixture.calls.length;
  assert.equal((await invoke('POST', 'sign-out', {body: '{}'})).status, 200);
  assert.equal(fixture.calls.length, signoutCount + 1, 'Disallowed restored identities must still be able to sign out');
  await rejectBeforeProvider('sign-in/email', {email: approved, origin: null});
  await rejectBeforeProvider('sign-in/email', {email: approved, origin: 'https://evil.example'});
  await rejectBeforeProvider('sign-in/email', {email: approved, headers: {'sec-fetch-site': 'cross-site'}});
  await rejectBeforeProvider('sign-in/email', {email: approved, host: 'https://other.example'});
  await rejectBeforeProvider('sign-in/email', {body: 'x'.repeat(16_385)}, 413);

  const session = email => ({user: {id: 'synthetic-user', email, emailVerified: true}, session: {id: 'synthetic-session', token: 'synthetic-session-token'}});
  fixture.session = {data: session('other@example.org'), error: null};
  assert.equal(await auth.getPrincipal(), null);
  fixture.response = fixture.session.data;
  const denied = await invoke('GET', 'get-session', {query: '?disableCookieCache=false&disableCookieCache=false'});
  assert.equal(denied.status, 200);
  assert.equal(await denied.json(), null);
  assert.equal(denied.headers.get('set-cookie'), null);
  assert.equal(denied.headers.get('x-fixture'), null);
  assert.deepEqual(new URL(fixture.calls.at(-1).url).searchParams.getAll('disableCookieCache'), ['true']);
  fixture.response = session(approved);
  for (const verified of [true, false]) {
    fixture.response.user.emailVerified = verified;
    fixture.session = {data: fixture.response, error: null};
    assert.deepEqual(await auth.getPrincipal(), {id: 'synthetic-user', email: approved, emailVerified: verified});
    assert.deepEqual(fixture.sessionCalls.at(-1), {query: {disableCookieCache: 'true'}});
    const response = await invoke('GET', 'get-session');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), fixture.response);
    assert.equal(response.headers.get('set-cookie')?.includes('HttpOnly; Secure; SameSite=Strict'), true);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  for (const anonymous of [null, {user: null, session: null}]) {
    fixture.response = anonymous;
    const response = await invoke('GET', 'get-session');
    assert.equal(await response.json(), null);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  for (const malformed of [{}, [], {user: {}}, {user: {id: '', email: approved}}]) {
    fixture.response = malformed;
    assert.equal((await invoke('GET', 'get-session')).status, 503);
  }
  fixture.responseText = 'invalid-json';
  assert.equal((await invoke('GET', 'get-session')).status, 503);
  fixture.responseText = null;
  fixture.responseStatus = 500;
  const unavailable = await invoke('GET', 'get-session');
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('set-cookie'), null);
  fixture.responseStatus = 200;
  fixture.throw = true;
  await assert.rejects(auth.getPrincipal(), error => error.status === 503);
  assert.equal((await invoke('GET', 'get-session')).status, 503);
  fixture.throw = false;
  fixture.session = {data: null, error: {message: 'synthetic provider failure'}};
  await assert.rejects(auth.getPrincipal(), error => error.status === 503);

  // Re-evaluate gates after the SDK singleton exists; mode changes must not be cached.
  process.env.FULLVIEW_AUTH_MODE = 'public';
  delete process.env.FULLVIEW_AUTH_TEST_EMAIL;
  assert.equal(auth.authenticationConfigured(), true);
  fixture.session = {data: session('other@example.org'), error: null};
  fixture.response = fixture.session.data;
  assert.equal((await auth.getPrincipal()).email, 'other@example.org');
  for (const path of [...paths, ...links]) assert.equal((await invoke('POST', path, {email: 'other@example.org'})).status, 200);
  assert.deepEqual(await (await invoke('GET', 'get-session')).json(), fixture.response);
  process.env.FULLVIEW_AUTH_MODE = 'validation';
  assert.equal(auth.authenticationConfigured(), false);
  await rejectBeforeProvider('sign-in/email', {email: approved}, 503);
  assert.equal(fixture.config.cookies.sameSite, 'strict');
  console.log('PASS: explicit auth modes fail closed; exact normalized test address gates all six account/OTP actions before provider calls; link flows blocked during validation; restored identities filtered without token/cookie leaks; live session cache bypass forced; signout and public mode preserved. Mock SDK only; no real account or email.');
} finally {
  for (const key of keys) {if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];}
  delete globalThis.__fullviewValidationFixture;
}
