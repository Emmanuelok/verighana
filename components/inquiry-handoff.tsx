'use client';

import {useState} from 'react';
import {Copy} from 'lucide-react';
import {inquirySummary} from '../lib/inquiry-summary';
import type {Brief} from '../lib/local-briefs';

export function InquiryHandoff({brief}: {brief: Brief}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const summary = inquirySummary(brief);
  async function copy() {
    try {await navigator.clipboard.writeText(summary); setMessage('Copied. Review the recipient and send it yourself through your existing contact channel.');}
    catch {setMessage('Automatic copying is unavailable. Select and copy the text below.');}
  }
  return <section className="inquiry-handoff" aria-label="Prepare an inquiry"><h3>Your next step</h3><p>Prepare an inquiry to share through your existing Fullview contact channel. This desk does not send messages or confirm availability. If you do not yet have a contact, keep your PDF until a verified inquiry channel is available.</p>
    <button className="text-link" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide inquiry text' : 'Review inquiry text'} <Copy size={16}/></button>
    {open && <><label className="field">Inquiry text — review before sharing<textarea readOnly value={summary}/></label><button className="button outline" onClick={() => void copy()}>Copy inquiry text <Copy size={16}/></button><p className="fine-print">Includes the contact details and project description you entered. No recipient is selected and nothing is sent automatically.</p></>}
    {message && <p role="status">{message}</p>}
  </section>;
}
