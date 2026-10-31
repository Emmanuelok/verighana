'use client';

import {useCallback, useEffect, useRef, useState, type FormEvent} from 'react';
import {ArrowRight, CheckCircle2, Phone} from 'lucide-react';
import {fullviewContact} from '../lib/contact';
import {ContactEmail} from './contact-email';

const consentVersion = 'fullview-inquiry-v1';
const emptyFields = {name: '', email: '', subject: '', message: '', website: ''};
type Fields = typeof emptyFields;
type Availability = {state: 'loading' | 'unavailable'} | {state: 'available'; retentionDays: number};
type Receipt = {reference: string; notification: 'pending' | 'accepted' | 'failed' | 'unknown'; message: string};
const notificationMessages: Record<Receipt['notification'], string> = {
  pending: 'Your inquiry is saved. The email notification to the Fullview office is pending.',
  accepted: 'Your inquiry is saved and the email provider accepted the office notification. Inbox delivery has not been confirmed.',
  failed: 'Your inquiry is saved, but the office email notification failed. Please contact Fullview with your reference.',
  unknown: 'Your inquiry is saved. The office email notification outcome could not be confirmed.',
};

async function responseObject(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid response');
  return value as Record<string, unknown>;
}

async function readAvailability(signal: AbortSignal): Promise<Availability> {
  if (!fullviewContact.emailReady) return {state: 'unavailable'};
  try {
    const response = await fetch('/api/inquiries', {cache: 'no-store', credentials: 'same-origin', signal});
    const result = await responseObject(response);
    if (response.ok && result.available === true && result.recipient === fullviewContact.email &&
      result.consentVersion === consentVersion && typeof result.retentionDays === 'number' &&
      Number.isSafeInteger(result.retentionDays) && result.retentionDays > 0 && result.retentionDays <= 30) {
      return {state: 'available', retentionDays: result.retentionDays};
    }
  } catch { /* A failed readiness check must not enable submission. */ }
  return {state: 'unavailable'};
}

export function ContactForm() {
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [consent, setConsent] = useState(false);
  const [availability, setAvailability] = useState<Availability>({state: 'loading'});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const attempt = useRef<{key: string; fingerprint: string} | null>(null);
  const startedAt = useRef(0);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const configurationRequest = useRef<AbortController | null>(null);
  const submissionRequest = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLHeadingElement>(null);

  const checkAvailability = useCallback(() => {
    configurationRequest.current?.abort();
    const controller = new AbortController();
    configurationRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    void readAvailability(controller.signal).then(next => {
      if (mounted.current && configurationRequest.current === controller) setAvailability(next);
    }).finally(() => clearTimeout(timeout));
  }, []);

  useEffect(() => {
    mounted.current = true;
    startedAt.current = Date.now();
    void checkAvailability();
    return () => {
      mounted.current = false;
      configurationRequest.current?.abort();
      submissionRequest.current?.abort();
    };
  }, [checkAvailability]);
  useEffect(() => {if (error) errorRef.current?.focus();}, [error]);
  useEffect(() => {if (receipt) receiptRef.current?.focus();}, [receipt]);

  function updateField(key: keyof Fields, value: string) {
    setFields(previous => ({...previous, [key]: value}));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !fullviewContact.emailReady || availability.state !== 'available' || !consent) return;
    submitting.current = true;
    setBusy(true); setError(''); setRequestId('');
    const controller = new AbortController();
    submissionRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const details = {...fields, name: fields.name.trim(), email: fields.email.trim(), subject: fields.subject.trim(), message: fields.message.trim(), consent: true, consentVersion};
      const fingerprint = JSON.stringify(details);
      // Reuse the key after an uncertain response. Changed content starts a distinct request.
      if (!attempt.current || attempt.current.fingerprint !== fingerprint) {
        attempt.current = {key: crypto.randomUUID(), fingerprint};
      }
      const response = await fetch('/api/inquiries', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...details, idempotencyKey: attempt.current.key, startedAt: startedAt.current}),
        signal: controller.signal,
      });
      const result = await responseObject(response);
      if (!mounted.current) return;
      if (!response.ok) {
        if (response.status === 503) setAvailability({state: 'unavailable'});
        setError(typeof result.error === 'string' && result.error.length <= 500 ? result.error : 'Your inquiry could not be submitted. Review your details and try again.');
        if (typeof result.requestId === 'string' && result.requestId.length <= 100) setRequestId(result.requestId);
        return;
      }
      if (![200, 201].includes(response.status) || typeof result.reference !== 'string' || !result.reference || result.reference.length > 100 ||
        typeof result.notification !== 'string' || !['pending', 'accepted', 'failed', 'unknown'].includes(result.notification) || typeof result.message !== 'string') {
        throw new Error('Unconfirmed response');
      }
      setReceipt({reference: result.reference, notification: result.notification as Receipt['notification'], message: result.message.slice(0, 1000)});
    } catch {
      if (mounted.current) setError('We could not confirm whether your inquiry was received. Your details are still here. Retry with the same details to check the same request, or contact Fullview before sending another inquiry.');
    } finally {
      clearTimeout(timeout);
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function startAnother() {
    attempt.current = null;
    startedAt.current = Date.now();
    setFields(emptyFields); setConsent(false); setError(''); setRequestId(''); setReceipt(null);
  }

  if (receipt) return <section className="contact-receipt" aria-label="Inquiry receipt">
    <CheckCircle2 size={36} aria-hidden="true"/>
    <h2 ref={receiptRef} tabIndex={-1}>Your inquiry is recorded.</h2>
    <p className="contact-reference">Reference <strong>{receipt.reference}</strong></p>
    <p>{notificationMessages[receipt.notification]}</p>
    <p>{receipt.message}</p>
    <p className="fine-print">Keep your reference. This receipt does not confirm a consultation, quote acceptance or booking.</p>
    <ContactFallback/>
    <button className="button outline" type="button" onClick={startAnother}>Write another inquiry <ArrowRight size={17}/></button>
  </section>;

  return <div className="contact-form-panel">
    <h2>A clear first step.</h2>
    {availability.state === 'loading' ? <p role="status" className="muted-info">Checking online inquiry availability…</p> :
      availability.state === 'unavailable' ? <div className="contact-availability" role="status"><p>Online inquiries are not available right now. Please call Fullview. Sending is disabled until availability is confirmed.</p><ContactFallback/><button className="text-link" type="button" onClick={() => {setAvailability({state: 'loading'}); setConsent(false); void checkAvailability();}}>Check availability again</button></div> : null}
    <form onSubmit={event => void submit(event)} aria-describedby="contact-disclosure">
      {error && <div className="contact-error" role="alert" tabIndex={-1} ref={errorRef}><p>{error}</p>{requestId && <p>Support reference: {requestId}</p>}</div>}
      <fieldset disabled={busy} className="contact-fields">
        <legend className="sr-only">Your inquiry details</legend>
        <div className="contact-field-grid">
          <label className="field">Your name *<input name="name" autoComplete="name" value={fields.name} required minLength={2} maxLength={120} onChange={event => updateField('name', event.target.value)}/></label>
          <label className="field">Email address *<input name="email" type="email" autoComplete="email" value={fields.email} required maxLength={254} onChange={event => updateField('email', event.target.value)}/></label>
        </div>
        <label className="field">Subject *<input name="subject" value={fields.subject} required minLength={5} maxLength={200} onChange={event => updateField('subject', event.target.value)} placeholder="What would you like to discuss?"/></label>
        <label className="field">Your message *<textarea name="message" value={fields.message} required minLength={20} maxLength={6000} rows={7} onChange={event => updateField('message', event.target.value)} placeholder="Tell us about your question, current stage and the support you need."/><small>{fields.message.length.toLocaleString()}/6,000 characters · Minimum 20</small></label>
        <div className="contact-honeypot" aria-hidden="true"><label>Website<input name="website" autoComplete="off" tabIndex={-1} value={fields.website} onChange={event => updateField('website', event.target.value)}/></label></div>
        <div id="contact-disclosure" className="contact-disclosure"><h3>Before you send</h3><p>Submitting sends your name, email, subject and message to Fullview and stores an inquiry record. An office notification is addressed to <strong>{fullviewContact.email}</strong>.</p>
          {availability.state === 'available' ? <p>Your details are retained under Fullview’s inquiry policy, with a retention review after {availability.retentionDays} days from submission. A review does not confirm automatic deletion. Contact Fullview to request help or deletion of your submitted information.</p> : <p>The retention policy must be available before online submission is enabled.</p>}
          <p>Use a high-level summary. Do not include participant identifiers, confidential datasets, passwords or private files. This inquiry does not create a booking or paid engagement.</p>
        </div>
        <label className="contact-consent"><input type="checkbox" name="consent" required checked={consent} disabled={availability.state !== 'available'} onChange={event => setConsent(event.target.checked)}/><span>I agree to send these details to Fullview for responding to this inquiry, with the storage and email handling described above.</span></label>
        <button className="button contact-submit" type="submit" disabled={busy || availability.state !== 'available'} aria-busy={busy}>{busy ? 'Sending inquiry…' : 'Send inquiry'} <ArrowRight size={18}/></button>
      </fieldset>
    </form>
    <p className="fine-print">Details entered here stay in this open page until you submit. This form does not save a draft in your browser storage.</p>
  </div>;
}

function ContactFallback() {
  return <div className="contact-fallback"><ContactEmail/><a href={fullviewContact.phoneHref}><Phone size={18} aria-hidden="true"/><span>{fullviewContact.phoneDisplay}</span></a></div>;
}
