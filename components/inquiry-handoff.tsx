'use client';

import {useState} from 'react';
import {Copy, Phone} from 'lucide-react';
import {inquirySummary} from '../lib/inquiry-summary';
import {fullviewContact} from '../lib/contact';
import type {Brief} from '../lib/local-briefs';

export function InquiryHandoff({brief}: {brief: Brief}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const summary = inquirySummary(brief);
  async function copy() {
    try {await navigator.clipboard.writeText(summary); setMessage('Copied for your records. Call Fullview to discuss your project and agree how to share your brief. Nothing has been sent.');}
    catch {setMessage('Automatic copying is unavailable. Select and copy the text below.');}
  }
  return <section className="inquiry-handoff" aria-label="Prepare an inquiry"><h3>Your next step</h3><p>Call Fullview to discuss your project, check availability and agree how to share your brief. Keep your PDF or project notes ready. This desk does not send your brief or confirm a booking.</p>
    <div className="inquiry-actions"><a className="button" href={fullviewContact.phoneHref} aria-label={`Call Fullview Signature on ${fullviewContact.phoneDisplay}`}><Phone size={17} aria-hidden="true"/>Call {fullviewContact.phoneDisplay}</a>
    <button className="text-link" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide project notes' : 'Review project notes'} <Copy size={16} aria-hidden="true"/></button></div>
    {open && <><label className="field">Project notes — for your call<textarea readOnly value={summary}/></label><button className="button outline" onClick={() => void copy()}>Copy project notes <Copy size={16} aria-hidden="true"/></button><p className="fine-print">Includes the contact details and project description you entered. Copying keeps the text on your device; it does not send anything to Fullview.</p></>}
    {message && <p role="status">{message}</p>}
  </section>;
}
