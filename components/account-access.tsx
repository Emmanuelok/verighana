'use client';

import {useEffect, useRef, useState, type FormEvent, type MouseEvent} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {ArrowRight, Check, LoaderCircle, LockKeyhole, Mail, ShieldCheck} from 'lucide-react';
import {fullviewAuthClient} from '../lib/fullview-auth-client';
import type {Principal} from '../lib/operations/core';

type Mode = 'signin'|'signup'|'verify'|'recover'|'reset';
type AuthResult = {error: {message?: string; code?: string; status?: number}|null};
const serviceUnavailable = 'Account services are temporarily unavailable. Please try again, or contact Fullview for help.';
function accountError(reason: unknown, fallback: string): string {
  const detail = reason && typeof reason === 'object' ? reason as {message?: unknown; status?: unknown} : null;
  const message = typeof detail?.message === 'string' ? detail.message.trim() : '';
  if ((typeof detail?.status === 'number' && (detail.status === 0 || (detail.status >= 500 && detail.status < 600))) ||
      /\bHTTP\s+5\d\d\b|\b(?:failed to fetch|fetch failed|networkerror|network(?: error| request failed)|load failed|service unavailable|internal server error|request timed out)\b/i.test(message)) return serviceUnavailable;
  return message || fallback;
}
const titles: Record<Mode, string> = {signin: 'Welcome back.', signup: 'Make room for your next idea.', verify: 'Check your inbox.', recover: 'Let’s get you back in.', reset: 'A fresh start.'};
const descriptions: Record<Mode, string> = {
  signin: 'Sign in to your Fullview account.',
  signup: 'Create your Fullview account with the email address approved for access.',
  verify: 'Confirm your email address to finish setting up your account.',
  recover: 'Enter your account email to request a password reset code.',
  reset: 'Enter the code from your email and choose a new password.',
};
const actions: Record<Mode, string> = {signin: 'Sign in', signup: 'Create your account', verify: 'Verify email', recover: 'Request reset code', reset: 'Update password'};
const pendingActions: Record<Mode, string> = {signin: 'Signing in…', signup: 'Creating account…', verify: 'Verifying email…', recover: 'Requesting code…', reset: 'Updating password…'};

export function AccountAccess({initialPrincipal, initialMode = 'signin', availability = 'validation', projectsAvailable = false}: {
  initialPrincipal: Principal|null; initialMode?: Mode; availability?: 'validation'|'public'; projectsAvailable?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const navigationKey = params.toString();
  const modes = params.getAll('mode');
  const candidate = modes.length === 1 ? modes[0].trim().toLowerCase() : modes.length ? 'signin' : initialMode;
  const requestedMode = Object.hasOwn(titles, candidate) ? candidate as Mode : 'signin';
  const [principal, setPrincipal] = useState(initialPrincipal);
  const serverPrincipalKey = JSON.stringify(initialPrincipal ? [initialPrincipal.id, initialPrincipal.email, initialPrincipal.emailVerified] : null);
  const principalKey = JSON.stringify(principal ? [principal.id, principal.email, principal.emailVerified] : null);
  const [renderedPrincipalKey, setRenderedPrincipalKey] = useState(serverPrincipalKey);
  const [serverIdentityRevision, setServerIdentityRevision] = useState(0);
  const mode: Mode = principal && !principal.emailVerified ? 'verify' : requestedMode;
  const [email, setEmail] = useState(initialPrincipal?.email ?? '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestRevision = useRef(0);
  const mountedRef = useRef(false);
  const activeRequest = useRef<symbol|null>(null);
  const [pendingAction, setPendingAction] = useState('');
  const [message, setMessage] = useState<{mode: Mode; text: string}|null>(null);
  const [error, setError] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [renderedMode, setRenderedMode] = useState(mode);
  const noticeRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  // Reconcile a changed server identity without replacing a newer local result
  // when a refresh repeats the same server props.
  if (renderedPrincipalKey !== serverPrincipalKey) {
    setRenderedPrincipalKey(serverPrincipalKey);
    if (principalKey !== serverPrincipalKey) {
      setServerIdentityRevision(value => value + 1); setPrincipal(initialPrincipal);
      setEmail(initialPrincipal?.email ?? ''); setPassword(''); setConfirmPassword('');
      setCode(''); setError(''); setMessage(null);
    }
  }
  // Also clear sensitive fields when navigation comes from browser Back/Forward.
  if (renderedMode !== mode) {
    setRenderedMode(mode); setPassword(''); setConfirmPassword(''); setCode(''); setError('');
    if (message?.mode !== mode) setMessage(null);
  }
  // URL checks fence immediate navigation; the revision also fences a round trip
  // back to the same URL, changed server identities and component unmounts.
  useEffect(() => {
    mountedRef.current = true;
    const invalidate = () => {requestRevision.current += 1;};
    window.addEventListener('popstate', invalidate);
    return () => {mountedRef.current = false; invalidate(); window.removeEventListener('popstate', invalidate);};
  }, []);
  useEffect(() => () => {requestRevision.current += 1;}, [navigationKey, serverIdentityRevision]);
  function changeMode(next: Mode, notice?: string) {
    setPassword(''); setConfirmPassword(''); setCode(''); setError('');
    setMessage(notice ? {mode: next, text: notice} : null);
    router.push(`/account?mode=${next}`, {scroll: false});
  }
  function followMode(event: MouseEvent<HTMLAnchorElement>, next: Mode) {
    if (busyRef.current) {event.preventDefault(); return;}
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); if (next === mode) return; changeMode(next);
  }
  async function refreshPrincipal(assertCurrent: () => void) {
    const result = await fullviewAuthClient.getSession({query: {disableCookieCache: true}});
    assertCurrent();
    if (result.error) throw new Error('Your session could not be checked. Please try again.');
    const user = result.data?.user;
    const next = user ? {id: user.id, email: user.email, emailVerified: user.emailVerified === true} : null;
    setPrincipal(next); router.refresh(); return next;
  }
  function check(result: AuthResult, fallback: string) {
    if (result.error) throw new Error(accountError(result.error, fallback));
  }
  async function run(action: (assertCurrent: () => void) => Promise<void>, pending = pendingActions[mode]) {
    if (busyRef.current) return;
    const revision = requestRevision.current, location = window.location.href, requestId = Symbol();
    const isCurrent = () => mountedRef.current && requestRevision.current === revision && window.location.href === location;
    const assertCurrent = () => {if (!isCurrent()) throw new Error('Account action no longer belongs to this screen.');};
    activeRequest.current = requestId; busyRef.current = true; setBusy(true); setPendingAction(pending); setError(''); setMessage(null);
    try {await action(assertCurrent);}
    catch (reason) {if (isCurrent()) setError(accountError(reason, 'Account services are unavailable. Please try again.'));}
    finally {if (activeRequest.current === requestId) {activeRequest.current = null; busyRef.current = false; if (mountedRef.current) setBusy(false);}}
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(async assertCurrent => {
      const address = email.trim();
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name.');
        if (password !== confirmPassword) throw new Error('The passwords do not match. Please enter the same password in both fields.');
        check(await fullviewAuthClient.signUp.email({name: name.trim(), email: address, password}), 'Your account could not be created.');
        assertCurrent();
        setPassword(''); setConfirmPassword('');
        await refreshPrincipal(assertCurrent); assertCurrent();
        changeMode('verify', 'Your account was created. Request a verification code below to confirm your email.');
      } else if (mode === 'signin') {
        check(await fullviewAuthClient.signIn.email({email: address, password}), 'Sign-in failed. Check your details and try again.');
        assertCurrent();
        setPassword('');
        const next = await refreshPrincipal(assertCurrent); assertCurrent();
        if (!next) throw new Error('Sign-in could not be confirmed. Please try again.');
        if (!next.emailVerified) changeMode('verify', 'You are signed in. Confirm your email to finish setting up your account.');
        else setMessage({mode, text: 'You are signed in.'});
      } else if (mode === 'verify') {
        check(await fullviewAuthClient.emailOtp.verifyEmail({email: address, otp: code.trim()}), 'The code could not be verified.');
        assertCurrent();
        setCode('');
        const next = await refreshPrincipal(assertCurrent); assertCurrent();
        changeMode('signin', next?.emailVerified ? 'Your email is verified.' : 'Your email was verified. Sign in to continue.');
      } else if (mode === 'recover') {
        check(await fullviewAuthClient.emailOtp.requestPasswordReset({email: address}), 'A reset code could not be requested. Please try again.');
        assertCurrent();
        changeMode('reset', 'If an account exists for that email, a reset code will be sent. Check your inbox and enter the code below.');
      } else {
        if (password !== confirmPassword) throw new Error('The passwords do not match. Please enter the same password in both fields.');
        check(await fullviewAuthClient.emailOtp.resetPassword({email: address, otp: code.trim(), password}), 'Your password could not be reset.');
        assertCurrent();
        changeMode('signin', 'Your password was updated. Sign in with your new password.');
      }
    });
  }
  async function requestCode() {
    if (busyRef.current || !emailRef.current?.reportValidity()) return;
    await run(async assertCurrent => {
      if (Date.now() < resendAt) throw new Error('Please wait one minute before requesting another code.');
      check(await fullviewAuthClient.emailOtp.sendVerificationOtp({email: email.trim(), type: 'email-verification'}), 'A verification code could not be requested.');
      assertCurrent();
      setResendAt(Date.now() + 60_000);
      setMessage({mode, text: 'A verification code was requested. Check your email; delivery may take a moment.'});
    }, 'Requesting code…');
  }
  const verified = principal?.emailVerified === true;
  const notice = message?.mode === mode ? message.text : '';
  useEffect(() => {if (error || notice) noticeRef.current?.focus();}, [error, notice]);
  const modeLink = (next: Mode, label: string, className = 'account-text-link') => <Link href={`/account?mode=${next}`} scroll={false} className={className} aria-current={!verified && mode === next ? 'page' : undefined} aria-disabled={busy || undefined} onClick={event => followMode(event, next)}>{label}</Link>;

  return <section className="account-access" aria-labelledby="account-form-title">
    {!principal && <nav className="account-mode-nav" aria-label="Account options">{modeLink('signin', 'Sign in', 'account-mode-link')}{modeLink('signup', 'Create account', 'account-mode-link')}</nav>}
    <div className="account-form-heading"><span className="account-form-icon" aria-hidden="true">{verified ? <Check/> : mode === 'verify' || mode === 'recover' ? <Mail/> : <LockKeyhole/>}</span><h2 id="account-form-title">{verified ? 'You’re in.' : titles[mode]}</h2>
      <p>{verified ? 'Your email is verified and your account is ready.' : mode === 'signup' && availability === 'public' ? 'Create your Fullview account to get started.' : descriptions[mode]}</p>
    </div>
    {principal && <p className="account-identity">Signed in as <strong>{principal.email}</strong>{!verified && <span>Email verification required</span>}</p>}
    {(error || notice) && <div ref={noticeRef} tabIndex={-1} className={`account-notice ${error ? 'account-notice-error' : 'account-notice-success'}`} role={error ? 'alert' : 'status'}><strong>{error ? 'We couldn’t complete that.' : 'Update'}</strong><p>{error || notice}</p>{error && <Link href="/contact">Contact Fullview for help <ArrowRight size={16} aria-hidden="true"/></Link>}</div>}
    {verified ? <div className="account-signed-in">
      {projectsAvailable ? <Link className="account-submit" href="/projects">Open your projects <ArrowRight size={20} aria-hidden="true"/></Link> : <><p>Project tracking is being connected. You can prepare a brief in the research desk or contact us about an existing project.</p><Link className="account-submit" href="/workspace">Open the research desk <ArrowRight size={20} aria-hidden="true"/></Link></>}
      {projectsAvailable && <Link className="account-text-link" href="/workspace">Prepare a local brief</Link>}
    </div> : <>
      <form onSubmit={submit} aria-busy={busy} className="account-form">
        <fieldset disabled={busy}>
          <legend className="sr-only">{actions[mode]}</legend>
          {mode === 'signup' && <label className="account-field">Your name<input required autoComplete="name" maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Your full name"/></label>}
          <label className="account-field">Email address<input ref={emailRef} type="email" required maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} readOnly={!!principal} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></label>
          {(mode === 'verify' || mode === 'reset') && <label className="account-field">Code from your email<input required inputMode="numeric" autoComplete="one-time-code" minLength={4} maxLength={16} value={code} onChange={event => setCode(event.target.value)} aria-describedby="code-help"/><span className="account-field-help" id="code-help">Use the latest code. If it has expired, request a new one.</span></label>}
          {(mode === 'signin' || mode === 'signup' || mode === 'reset') && <label className="account-field">{mode === 'reset' ? 'New password' : 'Password'}<input type="password" required minLength={mode === 'signin' ? 1 : 8} maxLength={128} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} aria-describedby={mode !== 'signin' ? 'password-help' : undefined}/>{mode !== 'signin' && <span className="account-field-help" id="password-help">Use at least 8 characters.</span>}</label>}
          {(mode === 'signup' || mode === 'reset') && <label className="account-field">Confirm password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/></label>}
          {mode === 'signin' && <div className="account-recovery-link">{modeLink('recover', 'Forgot your password?')}</div>}
          <button className="account-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="account-spinner" size={20} aria-hidden="true"/>{pendingAction}</> : <>{actions[mode]}<ArrowRight size={20} aria-hidden="true"/></>}</button>
        </fieldset>
      </form>
      {mode === 'verify' && <div className="account-code-request"><button className="account-text-link" type="button" disabled={busy || !email.trim()} onClick={() => void requestCode()}>Request verification code</button></div>}
    </>}
    <div className="account-secondary-actions">
      {principal ? <button className="account-text-link" type="button" disabled={busy} onClick={() => void run(async assertCurrent => {check(await fullviewAuthClient.signOut(), 'Sign-out could not be completed.'); assertCurrent(); setPrincipal(null); setEmail(''); changeMode('signin', 'You are signed out.'); router.refresh();}, 'Signing out…')}>Sign out</button> : <>
        {mode !== 'signin' && modeLink('signin', 'Back to sign in')}
        {mode === 'signin' && modeLink('verify', 'Verify an existing account')}
        {mode === 'reset' && modeLink('recover', 'Request a new reset code')}
      </>}
    </div>
    <div className="account-security-note"><ShieldCheck size={19} aria-hidden="true"/><span>Your local research drafts stay on this device until you choose to submit them.</span></div>
  </section>;
}
