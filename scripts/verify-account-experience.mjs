import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

// Synthetic hook/SDK fixtures only: no browser, credentials, provider or real email.
// These exercise deferred continuations and rendered state, not browser layout.
const require = createRequire(import.meta.url);
const {build} = require('esbuild'), React = require('react');
let host;
const hooks = {
  ...React,
  useState(initial) {
    const index = host.index++;
    if (!(index in host.values)) host.values[index] = typeof initial === 'function' ? initial() : initial;
    const own = host;
    return [own.values[index], value => {
      const next = typeof value === 'function' ? value(own.values[index]) : value;
      if (!Object.is(next, own.values[index])) {
        own.values[index] = next; own.dirty = true;
        if (!own.mounted) own.afterUnmount++;
      }
    }];
  },
  useRef(initial) {const index = host.index++; return host.values[index] ??= {current: initial};},
  useEffect(effect, deps) {
    const index = host.index++, old = host.effects.get(index);
    if (!old || deps.some((value, position) => !Object.is(value, old.deps[position]))) host.pending.set(index, {effect, deps});
  },
};
const bundle = await build({
  entryPoints: ['components/account-access.tsx'], bundle: true, write: false,
  format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent',
  plugins: [{name: 'auth-mock', setup(builder) {
    builder.onResolve({filter: /fullview-auth-client$/}, () => ({path: 'auth-mock', namespace: 'mock'}));
    builder.onLoad({filter: /.*/, namespace: 'mock'}, () => ({contents: 'export const fullviewAuthClient=globalThis.__accountTestClient;', loader: 'js'}));
  }}],
});
const success = {error: null};
const verifiedUser = {id: 'synthetic-user', email: 'synthetic@example.org', emailVerified: true};
const unavailable = 'Account services are temporarily unavailable. Please try again, or contact Fullview for help.';
function deferred() {let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};}
function nodes(element, test) {
  if (!element || typeof element !== 'object') return [];
  return [...(test(element) ? [element] : []), ...React.Children.toArray(element.props?.children).flatMap(child => nodes(child, test))];
}
function words(element) {
  if (typeof element === 'string') return element;
  if (typeof element === 'number') return String(element);
  return element && typeof element === 'object' ? React.Children.toArray(element.props?.children).map(words).join('') : '';
}
function create(initialMode = 'signin', principal = null) {
  const calls = {}, impl = {};
  const call = name => (...args) => {calls[name] = (calls[name] ?? 0) + 1; return impl[name]?.(...args) ?? Promise.resolve(success);};
  const sdk = {
    signUp: {email: call('signup')}, signIn: {email: call('signin')}, signOut: call('signout'), getSession: call('session'),
    emailOtp: {verifyEmail: call('verify'), requestPasswordReset: call('recover'), resetPassword: call('reset'), sendVerificationOtp: call('code')},
  };
  globalThis.__accountTestClient = sdk;
  const view = {
    values: [], effects: new Map(), pending: new Map(), index: 0, dirty: false, mounted: true, afterUnmount: 0,
    params: new URLSearchParams('mode=' + initialMode),
    props: {initialPrincipal: principal, initialMode, availability: 'validation', projectsAvailable: false},
    calls, impl, pushes: [], refreshes: 0, focuses: 0, validations: 0, valid: true, listeners: new Set(),
  };
  const router = {push(url) {view.pushes.push(url);}, refresh() {view.refreshes++;}};
  const compiled = {exports: {}};
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(id =>
    id === 'react' ? hooks : id === 'next/navigation' ? {useRouter: () => router, useSearchParams: () => view.params} :
      id === 'next/link' ? 'a' : require(id), compiled, compiled.exports);
  view.component = compiled.exports.AccountAccess;
  const win = {
    location: {href: 'https://synthetic.invalid/account?' + view.params},
    addEventListener(name, fn) {assert.equal(name, 'popstate'); view.listeners.add(fn);},
    removeEventListener(name, fn) {assert.equal(name, 'popstate'); view.listeners.delete(fn);},
  };
  view.render = () => {
    globalThis.window = win; host = view;
    let attempts = 0;
    do {view.index = 0; view.dirty = false; view.element = view.component(view.props); assert.ok(++attempts < 20, 'Render settles');} while (view.dirty);
    for (const element of nodes(view.element, item => item.props?.ref)) {
      const ref = element.props.ref;
      if (ref && typeof ref === 'object') ref.current = element.type === 'input' ?
        {reportValidity() {view.validations++; return view.valid;}} : {focus() {view.focuses++;}};
    }
    for (const [index, effect] of view.pending) {
      view.effects.get(index)?.cleanup?.();
      view.effects.set(index, {...effect, cleanup: effect.effect()});
    }
    view.pending.clear(); return view.element;
  };
  view.navigate = (mode, pop = false) => {
    view.params = new URLSearchParams(typeof mode === 'string' ? 'mode=' + mode : mode);
    win.location.href = 'https://synthetic.invalid/account?' + view.params;
    if (pop) for (const fn of view.listeners) fn();
    view.render();
  };
  view.input = (label, value) => {
    const element = nodes(view.element, item => item.type === 'label' && words(item).startsWith(label))[0];
    assert.ok(element, label);
    nodes(element, item => item.type === 'input')[0].props.onChange({target: {value}}); view.render();
  };
  view.submit = () => nodes(view.element, item => item.type === 'form')[0].props.onSubmit({preventDefault() {}});
  view.click = label => {
    const button = nodes(view.element, item => (item.type === 'button' || item.type === 'a') && words(item) === label)[0];
    assert.ok(button, label); return button.props.onClick({preventDefault() {}});
  };
  view.unmount = () => {view.mounted = false; for (const effect of view.effects.values()) effect.cleanup?.();};
  view.render(); return view;
}
const priorFetch = globalThis.fetch, priorWindow = globalThis.window, priorClient = globalThis.__accountTestClient;
globalThis.fetch = async () => assert.fail('No real network permitted');
try {
  // URL normalization, changed server identity and configuration-aware project CTA.
  const initial = create(); initial.navigate('SIGNUP'); assert.ok(words(initial.element).includes('Make room for your next idea.'));
  initial.navigate([['mode', 'signup'], ['mode', 'recover']]); assert.ok(words(initial.element).includes('Welcome back.'));
  initial.props.initialPrincipal = verifiedUser; initial.render(); assert.ok(words(initial.element).includes('You’re in.'));
  assert.ok(!words(initial.element).includes('Open your projects'));
  initial.props.projectsAvailable = true; initial.render(); assert.ok(words(initial.element).includes('Open your projects'));
  initial.props.initialPrincipal = null; initial.render(); assert.ok(!words(initial.element).includes('Signed in as')); initial.unmount();

  // Clicking the current tab preserves typed fields, feedback and browser history.
  const active = create('signup'); active.input('Your name', 'Synthetic Client'); active.input('Email address', 'synthetic@example.org');
  active.input('Password', 'synthetic-test-password'); active.input('Confirm password', 'different-synthetic-password');
  await active.submit(); active.render(); const before = words(active.element);
  active.click('Create account'); active.render(); assert.equal(words(active.element), before); assert.deepEqual(active.pushes, []);
  assert.equal(nodes(active.element, item => item.type === 'input' && item.props.type === 'password')[0].props.value, 'synthetic-test-password');
  assert.equal(active.calls.signup ?? 0, 0); assert.equal(nodes(active.element, item => item.props?.role === 'alert').length, 1); assert.ok(active.focuses > 0); active.unmount();

  // Duplicate submits issue one request; late recovery must not navigate a different mode.
  const recovery = create('recover'), pending = deferred(); recovery.impl.recover = () => pending.promise;
  recovery.input('Email address', 'synthetic@example.org'); const first = recovery.submit(), second = recovery.submit();
  assert.equal(recovery.calls.recover, 1); recovery.navigate('signup', true); pending.resolve(success); await Promise.all([first, second]);
  recovery.render(); assert.deepEqual(recovery.pushes, []); assert.ok(!words(recovery.element).includes('reset code will be sent'));
  assert.equal(nodes(recovery.element, item => item.type === 'fieldset')[0].props.disabled, false); recovery.unmount();

  // A Back/Forward round trip to the original URL also invalidates the old response.
  const back = create(), signing = deferred(); back.input('Email address', 'synthetic@example.org'); back.input('Password', 'synthetic-test-password');
  back.impl.signin = () => signing.promise; const old = back.submit(); back.navigate('recover', true); back.navigate('signin', true);
  signing.resolve(success); await old; back.render(); assert.equal(back.calls.session ?? 0, 0); assert.deepEqual(back.pushes, []);
  assert.equal(nodes(back.element, item => item.type === 'input' && item.props.type === 'password')[0].props.value, ''); back.unmount();

  // Late session resolution cannot restore identity after navigation.
  const session = create(), checking = deferred(); session.input('Email address', 'synthetic@example.org'); session.input('Password', 'synthetic-test-password');
  session.impl.session = () => checking.promise; const signIn = session.submit(); await Promise.resolve(); assert.equal(session.calls.session, 1);
  session.navigate('recover', true); checking.resolve({error: null, data: {user: verifiedUser}}); await signIn; session.render();
  assert.equal(session.refreshes, 0); assert.ok(!words(session.element).includes('Signed in as')); session.unmount();

  // A delayed server acknowledgement of the existing identity must not cancel sign-out.
  const acknowledgement = create(); acknowledgement.input('Email address', 'synthetic@example.org'); acknowledgement.input('Password', 'synthetic-test-password');
  acknowledgement.impl.session = async () => ({error: null, data: {user: verifiedUser}});
  await acknowledgement.submit(); acknowledgement.render(); assert.ok(words(acknowledgement.element).includes('Signed in as'));
  const signingOut = deferred(); acknowledgement.impl.signout = () => signingOut.promise;
  acknowledgement.click('Sign out'); acknowledgement.props.initialPrincipal = {...verifiedUser}; acknowledgement.render();
  signingOut.resolve(success); await new Promise(resolve => setImmediate(resolve)); acknowledgement.render();
  assert.ok(!words(acknowledgement.element).includes('Signed in as')); assert.deepEqual(acknowledgement.pushes, ['/account?mode=signin']); acknowledgement.unmount();

  // Verification validates the visible email without requiring a code first.
  const verify = create('verify'); verify.input('Email address', 'synthetic@example.org');
  assert.equal(nodes(verify.element, item => item.type === 'input').length, 2); assert.equal(nodes(verify.element, item => item.type === 'form').length, 1);
  verify.valid = false; verify.click('Request verification code'); assert.equal(verify.validations, 1); assert.equal(verify.calls.code ?? 0, 0);
  verify.valid = true; verify.click('Request verification code'); verify.click('Request verification code'); assert.equal(verify.calls.code, 1);
  await new Promise(resolve => setImmediate(resolve)); verify.render(); assert.ok(words(verify.element).includes('A verification code was requested.')); assert.ok(verify.focuses > 0); verify.unmount();

  // Destination-mode feedback receives focus after navigation commits.
  const flow = create('recover'); flow.input('Email address', 'synthetic@example.org'); await flow.submit(); flow.render();
  assert.deepEqual(flow.pushes, ['/account?mode=reset']); assert.equal(flow.focuses, 0); flow.navigate('reset');
  assert.ok(flow.focuses > 0); assert.ok(words(flow.element).includes('If an account exists')); flow.unmount();

  // Server/network errors are readable; meaningful credential errors remain intact.
  for (const failure of [{status: 503, message: 'HTTP 503 Service Unavailable'}, {status: 500, message: 'Internal error'}, {message: 'HTTP 502 Bad Gateway'}, {message: 'NetworkError when attempting to fetch resource.'}, {message: 'Failed to fetch'}]) {
    const failed = create('recover'); failed.input('Email address', 'synthetic@example.org'); failed.impl.recover = async () => ({error: failure});
    await failed.submit(); failed.render(); assert.ok(words(failed.element).includes(unavailable)); assert.equal(nodes(failed.element, item => item.props?.role === 'alert').length, 1); failed.unmount();
  }
  const credentials = create(); credentials.input('Email address', 'synthetic@example.org'); credentials.input('Password', 'synthetic-test-password');
  credentials.impl.signin = async () => ({error: {status: 401, message: 'Invalid email or password'}});
  await credentials.submit(); credentials.render(); assert.ok(words(credentials.element).includes('Invalid email or password')); assert.ok(!words(credentials.element).includes(unavailable)); credentials.unmount();

  // Late rejection after unmount cannot update state, focus or navigate.
  const removed = create('recover'), late = deferred(); removed.input('Email address', 'synthetic@example.org'); removed.impl.recover = () => late.promise;
  const outstanding = removed.submit(); removed.unmount(); late.reject(new Error('Synthetic error')); await outstanding;
  assert.equal(removed.afterUnmount, 0); assert.deepEqual(removed.pushes, []);
  console.log('PASS: account modes, active-tab preservation, duplicate guards, stale deferred responses, Back/Forward, changed identity, delayed sign-out acknowledgement, visible-email validation, notice focus and readable errors. Local synthetic fixtures only; no browser/provider/network calls.');
} finally {
  globalThis.fetch = priorFetch;
  if (priorWindow === undefined) delete globalThis.window; else globalThis.window = priorWindow;
  if (priorClient === undefined) delete globalThis.__accountTestClient; else globalThis.__accountTestClient = priorClient;
}
