'use client';

import {useRef, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {fullviewAuthClient} from '../lib/fullview-auth-client';
import type {Principal} from '../lib/operations/core';

type Mode = 'signin'|'signup'|'verify'|'recover'|'reset';
type AuthResult = {error: {message?: string; code?: string}|null};

export function AccountAccess({initialPrincipal}: {initialPrincipal: Principal|null}) {
  const router = useRouter();
  const [principal, setPrincipal] = useState(initialPrincipal);
  const [mode, setMode] = useState<Mode>(initialPrincipal && !initialPrincipal.emailVerified ? 'verify' : 'signin');
  const [email, setEmail] = useState(initialPrincipal?.email ?? '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  function changeMode(next: Mode) {
    setMode(next); setPassword(''); setConfirmPassword(''); setCode(''); setError(''); setMessage('');
  }
  async function refreshPrincipal() {
    const result = await fullviewAuthClient.getSession({query: {disableCookieCache: true}});
    if (result.error) throw new Error('Your session could not be checked. Please try again.');
    const user = result.data?.user;
    const next = user ? {id: user.id, email: user.email, emailVerified: user.emailVerified === true} : null;
    setPrincipal(next);
    router.refresh();
    return next;
  }
  function check(result: AuthResult, fallback: string) {
    if (result.error) throw new Error(result.error.message || fallback);
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {await action();}
    catch (reason) {setError(reason instanceof Error ? reason.message : 'Account services are unavailable. Please try again.');}
    finally {setBusy(false); requestAnimationFrame(() => noticeRef.current?.focus());}
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const address = email.trim();
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('The passwords do not match.');
        const result = await fullviewAuthClient.signUp.email({name: name.trim(), email: address, password});
        check(result, 'Your account could not be created.');
        setPassword(''); setConfirmPassword('');
        await refreshPrincipal();
        setMode('verify');
        setMessage('Your account was created. Request a verification code below to confirm your email before accessing project records.');
      } else if (mode === 'signin') {
        const result = await fullviewAuthClient.signIn.email({email: address, password});
        check(result, 'Sign-in failed. Check your details and try again.');
        setPassword('');
        const next = await refreshPrincipal();
        if (!next) throw new Error('Sign-in could not be confirmed. Please try again.');
        if (!next.emailVerified) setMode('verify');
        setMessage(next.emailVerified ? 'You are signed in.' : 'Confirm your email before accessing shared project records.');
      } else if (mode === 'verify') {
        check(await fullviewAuthClient.emailOtp.verifyEmail({email: address, otp: code.trim()}), 'The code could not be verified.');
        setCode('');
        const next = await refreshPrincipal();
        setMode('signin');
        setMessage(next?.emailVerified ? 'Your email is verified.' : 'Your email was verified. Sign in to continue.');
      } else if (mode === 'recover') {
        check(await fullviewAuthClient.emailOtp.requestPasswordReset({email: address}), 'A reset code could not be requested. Please try again.');
        setMode('reset');
        setMessage('If an account exists for that email, the authentication service will send a reset code. Check your inbox and enter the code below.');
      } else {
        if (password !== confirmPassword) throw new Error('The passwords do not match.');
        check(await fullviewAuthClient.emailOtp.resetPassword({email: address, otp: code.trim(), password}), 'Your password could not be reset.');
        setPassword(''); setConfirmPassword(''); setCode(''); setMode('signin');
        setMessage('Your password was updated. Sign in with your new password.');
      }
    });
  }
  async function requestCode() {
    await run(async () => {
      if (Date.now() < resendAt) throw new Error('Please wait one minute before requesting another code.');
      check(await fullviewAuthClient.emailOtp.sendVerificationOtp({email: email.trim(), type: 'email-verification'}), 'A verification code could not be requested.');
      setResendAt(Date.now() + 60_000);
      setMessage('A verification code was requested. Check your email; delivery may take a moment.');
    });
  }
  const verified = principal?.emailVerified === true;
  const titles: Record<Mode,string> = {signin: 'Sign in', signup: 'Create your account', verify: 'Verify your email', recover: 'Recover your account', reset: 'Choose a new password'};

  return <section aria-labelledby="account-form-title">
    <h2 id="account-form-title">{verified ? 'Your account' : titles[mode]}</h2>
    {principal && <p>Signed in as <strong style={{overflowWrap: 'anywhere'}}>{principal.email}</strong>{!verified && ' · Email verification required'}</p>}
    {verified ? <div className="hero-buttons"><Link className="button" href="/projects">Open your projects</Link><Link className="text-link" href="/workspace">Prepare a local brief</Link></div> : <form onSubmit={submit} aria-busy={busy}>
      {mode === 'signup' && <label className="field">Your name<input required autoComplete="name" maxLength={120} value={name} onChange={event => setName(event.target.value)}/></label>}
      <label className="field">Email address<input type="email" required maxLength={254} autoComplete="email" value={email} readOnly={!!principal} onChange={event => setEmail(event.target.value)}/></label>
      {(mode === 'verify' || mode === 'reset') && <label className="field">Code from your email<input required inputMode="numeric" autoComplete="one-time-code" minLength={4} maxLength={16} value={code} onChange={event => setCode(event.target.value)} aria-describedby="code-help"/><small id="code-help">Use the latest code. If it has expired, request a new one.</small></label>}
      {(mode === 'signin' || mode === 'signup' || mode === 'reset') && <label className="field">{mode === 'reset' ? 'New password' : 'Password'}<input type="password" required minLength={mode === 'signin' ? 1 : 8} maxLength={128} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)}/></label>}
      {(mode === 'signup' || mode === 'reset') && <label className="field">Confirm password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/></label>}
      <div className="hero-buttons"><button className="button" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'recover' ? 'Request reset code' : mode === 'reset' ? 'Update password' : titles[mode]}</button>
        {mode === 'verify' && <button className="text-link" type="button" disabled={busy || !email.trim()} onClick={() => void requestCode()}>Request verification code</button>}
      </div>
    </form>}
    {(error || message) && <p ref={noticeRef} tabIndex={-1} className="muted-info" role={error ? 'alert' : 'status'}>{error || message}</p>}
    <div className="hero-buttons" style={{marginTop: 24}}>
      {principal ? <button className="text-link" type="button" disabled={busy} onClick={() => void run(async () => {check(await fullviewAuthClient.signOut(), 'Sign-out could not be completed.'); setPrincipal(null); setMode('signin'); setPassword(''); setCode(''); setMessage('You are signed out.'); router.refresh();})}>Sign out</button> : <>
        {mode !== 'signin' && <button className="text-link" type="button" disabled={busy} onClick={() => changeMode('signin')}>Back to sign in</button>}
        {mode === 'signin' && <><button className="text-link" type="button" disabled={busy} onClick={() => changeMode('signup')}>Create an account</button><button className="text-link" type="button" disabled={busy} onClick={() => changeMode('recover')}>Forgot your password?</button><button className="text-link" type="button" disabled={busy} onClick={() => changeMode('verify')}>Verify an existing account</button></>}
        {mode === 'reset' && <button className="text-link" type="button" disabled={busy} onClick={() => changeMode('recover')}>Request a new reset code</button>}
      </>}
    </div>
  </section>;
}
