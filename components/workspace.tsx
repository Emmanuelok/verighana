'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, FolderOpen, Laptop, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { audiences, money, rate } from '../lib/catalog';
import { services } from '../lib/catalog';
import { BRIEFS_KEY, DRAFT_KEY, getBriefPricing, budgets, emptyForm, localDate, readLocalBriefs, readLocalDraft, removeLocalBrief, saveLocalBrief, validateBrief, type Brief, type BriefForm } from '../lib/local-briefs';
import { AudienceSelect, useResearch } from './research-context';
import { PageIntro } from './research-pages';
import {PdfDownload} from './pdf-download';
import {InquiryHandoff} from './inquiry-handoff';
import {bundleBriefDraft, matchesBundleScope, parseBundleRequest, type BundleRequest} from '../lib/bundle-handoff';
import {getBundle} from '../lib/service-bundles';

export type Viewer = { name: string; email: string };

export function Workspace({ viewer }: { viewer: Viewer | null }) {
  const { audience, items, total, clear, policy, toast, replaceEstimate } = useResearch();
  const [tab, setTab] = useState<'new' | 'projects'>('new');
  const [step, setStep] = useState(1);
  const [records, setRecords] = useState<Brief[]>([]);
  const [form, setForm] = useState<BriefForm>({ ...emptyForm, name: viewer?.name || '', email: viewer?.email || '' });
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Brief | null>(null);
  const [consent, setConsent] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [pendingBundle, setPendingBundle] = useState<BundleRequest | null>(null);
  const [bundleError, setBundleError] = useState('');
  const draftWritable = useRef(true);
  const packageChanged = !receipt && !!form.packageRequest && !matchesBundleScope(form.packageRequest, audience, items);
  const stepRef = useRef<HTMLDivElement>(null);
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current !== step) { stepRef.current?.querySelector<HTMLElement>('h2')?.focus(); lastStep.current = step; }
  }, [step]);
  useEffect(() => { if (error) stepRef.current?.querySelector<HTMLElement>('[role="alert"]')?.focus(); }, [error]);
  function deskTabKey(event: KeyboardEvent<HTMLButtonElement>, current: 'new' | 'projects') {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'new' : event.key === 'End' ? 'projects' : current === 'new' ? 'projects' : 'new';
    setTab(next); document.getElementById(next === 'new' ? 'desk-create-tab' : 'desk-saved-tab')?.focus();
  }
  function applyBundle() {
    if (!pendingBundle) return;
    try {
      const draft = bundleBriefDraft(pendingBundle);
      if (!replaceEstimate(draft.audience, draft.selections)) return;
      setForm(previous => ({...previous, title: draft.title, description: draft.description, packageRequest: pendingBundle}));
      setStep(1); setReceipt(null); setConsent(false); setTab('new'); setPendingBundle(null); setError('');
      history.replaceState(history.state, '', location.pathname);
      draftWritable.current = true; setStorageWarning('');
      toast('Package applied. Add your research context and review the scope before saving.');
    } catch {setBundleError('This package could not be applied. Your existing draft has been kept.');}
  }


  async function load() {
    setLoading(true); setListError('');
    try {
      if (viewer) {
        const response = await fetch('/api/briefs', { cache: 'no-store' });
        const data = await response.json() as { error?: string; briefs: Brief[] };
        if (!response.ok) throw new Error(data.error || 'Unable to open your briefs.');
        setRecords(data.briefs);
      } else setRecords(readLocalBriefs(localStorage));
    } catch (err) { setListError(err instanceof Error ? err.message : 'Saved briefs are unavailable in this browser.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!viewer) {
      try { const draft = readLocalDraft(localStorage); if (draft) setForm(draft); }
      catch { draftWritable.current = false; setStorageWarning('Your saved draft could not be read. It has been left unchanged. You can work in this page and download a PDF; automatic draft saving is paused.'); }
    }
    try {setPendingBundle(parseBundleRequest(location.search));} catch (err) {setBundleError(err instanceof Error ? err.message : 'This bundle link could not be read.');}
    setReady(true);
    void load();
    const sync = (event: StorageEvent) => { if (event.key === BRIEFS_KEY && !viewer) void load(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
    // The viewer is fixed for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || viewer || receipt || !draftWritable.current) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); }
    catch { setStorageWarning('This browser cannot save drafts. Keep this page open and download a PDF copy.'); }
  }, [form, ready, viewer, receipt]);

  function setField(key: keyof BriefForm, value: string) { setForm(previous => ({ ...previous, [key]: value })); }
  function newBrief() {
    setStep(1); setReceipt(null); setConsent(false); setError(''); setTab('new');
    setForm(previous => ({ ...previous, title: '', description: '', deadline: '', packageRequest: null }));
  }

  async function createBrief(brief?: Brief) {
    if (!brief && packageChanged) throw new Error('Package scope has changed');
    const {createBriefPdf} = await import('../lib/brief-pdf');
    return createBriefPdf(brief || { ...form, budget: budgets.find(budget => budget === form.budget) || 'Please advise', audience, selections: items, estimate: total,
      id: 'UNSAVED DRAFT', createdAt: new Date().toISOString(), status: 'Draft — not submitted' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (packageChanged) {setError('Your estimate differs from the package scope. Reapply it or convert to a custom brief.'); return;}
    if (step < 3) { setStep(step + 1); return; }
    if (!consent) return;
    setBusy(true);
    try {
      const details = validateBrief({ ...form, audience, selections: items });
      let brief: Brief;
      if (viewer) {
        const response = await fetch('/api/briefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...details, consent }) });
        const data = await response.json() as { error?: string; brief: Brief };
        if (!response.ok) throw new Error(data.error || 'Unable to save your brief.');
        brief = data.brief;
      } else brief = saveLocalBrief(localStorage, details);
      setReceipt(brief); setRecords(previous => [brief, ...previous]); setStep(4); clear();
      if (!viewer && draftWritable.current) { try { localStorage.removeItem(DRAFT_KEY); } catch { /* The saved brief remains available. */ } }
      toast(viewer ? 'Your research brief has been saved.' : 'Your brief has been saved on this device.');
    } catch (err) {
      const message = err && typeof err === 'object' && 'issues' in err ? (err as { issues: { message: string }[] }).issues[0]?.message : undefined;
      setError(message || (err instanceof Error ? err.message : 'We could not save your brief. Download a PDF to keep a copy.'));
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); setListError('');
    try {
      if (viewer) {
        const response = await fetch('/api/briefs?id=' + encodeURIComponent(id), { method: 'DELETE' });
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error || 'Could not delete the brief.');
        setRecords(previous => previous.filter(brief => brief.id !== id));
      } else setRecords(removeLocalBrief(localStorage, id));
      setDeleteId(''); toast('The saved brief has been removed.');
    } catch (err) { setListError(err instanceof Error ? err.message : 'Could not remove the brief.'); }
    finally { setBusy(false); }
  }

  return <>
    <PageIntro eyebrow="YOUR PUBLIC RESEARCH DESK" title="A considered start." italic="A clearer next chapter." description="Bring your question, selected services and timeline together. Create a research brief and keep a PDF copy—no account required." />
    <section className="workspace-section wrap">
      <div className="desk-access-note"><Laptop size={22} aria-hidden="true" /><div><strong>{viewer ? 'Signed-in research desk' : 'Open to everyone. Your work stays with you.'}</strong><p>{viewer ? 'Your briefs are saved to your signed-in account.' : 'Drafts and saved briefs stay in this browser on this device. Download a PDF to keep or share a copy. Saving does not send your brief to Fullview.'}</p></div></div>
      {bundleError && <div className="form-error" role="alert">{bundleError} <a href="/bundles">Return to packages</a></div>}
      {pendingBundle && <section className="bundle-import" aria-label="Review bundle handoff"><span className="eyebrow">PACKAGE READY TO REVIEW</span><h2>{getBundle(pendingBundle.bundleId)?.title}</h2><p>Package total: GHS {money(bundleBriefDraft(pendingBundle).total)}. Applying this package replaces your current estimate, project title and description. Contact details and previously saved briefs are kept. Download your current draft first if you want to retain it.</p><p>The package’s quantities, exclusions and revision limits will appear in the description. Add your own research question and context before saving.</p><div className="hero-buttons"><button className="button" onClick={applyBundle}>Use this bundle <ArrowRight size={17}/></button><button className="text-link" onClick={() => {setPendingBundle(null); history.replaceState(history.state, '', location.pathname);}}>Keep my current draft</button></div></section>}
      {packageChanged && <section className="bundle-import" role="alert"><h2>Your package scope has changed.</h2><p>The current pathway or quantities differ from the package description. Reapply the original package to restore its scope, or start a custom description. Converting removes the package description; copy any notes you want to keep first.</p><div className="hero-buttons"><button className="button" onClick={() => {if (!form.packageRequest) return; try {const draft = bundleBriefDraft(form.packageRequest); replaceEstimate(draft.audience, draft.selections); setError('');} catch {setBundleError('This package is no longer available. Convert to a custom brief or choose another package.');}}}>Reapply original package</button><button className="text-link" onClick={() => {setForm(previous => ({...previous, packageRequest: null, title: 'Custom research support', description: ''})); setStep(1); setError('');}}>Convert to custom brief</button></div></section>}
      {storageWarning && <p className="form-error" role="status">{storageWarning}</p>}
      <div className="workspace-bar"><div className="workspace-tabs" role="tablist" aria-label="Research desk view">
        <button id="desk-create-tab" role="tab" tabIndex={tab === 'new' ? 0 : -1} onKeyDown={event => deskTabKey(event, 'new')} aria-selected={tab === 'new'} aria-controls="desk-create-panel" className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}><Plus size={17} /> Create a brief</button>
        <button id="desk-saved-tab" role="tab" tabIndex={tab === 'projects' ? 0 : -1} onKeyDown={event => deskTabKey(event, 'projects')} aria-selected={tab === 'projects'} aria-controls="desk-saved-panel" className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}><FolderOpen size={17} /> My briefs <span>{records.length}</span></button>
      </div><span className="desk-user">{viewer ? viewer.name || viewer.email : 'No sign-in required'}</span></div>

      {tab === 'projects' ? <div id="desk-saved-panel" role="tabpanel" aria-labelledby="desk-saved-tab" className="project-records">
        <div className="flex-between"><div><span className="eyebrow">{viewer ? 'YOUR SAVED RESEARCH REQUESTS' : 'SAVED IN THIS BROWSER'}</span><h2>The work ahead.</h2></div><button className="text-link" onClick={() => void load()} disabled={loading}><RefreshCw size={17} className={loading ? 'spin' : ''} /> Refresh</button></div>
        {listError && <div className="form-error" role="alert">{listError}</div>}
        {loading ? <p className="loading-state">Opening your briefs…</p> : records.length ? <div className="brief-list">{records.map(brief => <article className="brief-card" key={brief.id}>
          <div className="flex-between"><span className="eyebrow">{brief.id}</span><span className="status-tag">{brief.status}</span></div><h3>{brief.title}</h3>
          <div className="brief-meta"><span>{audiences.find(item => item.id === brief.audience)?.short}</span><span>Saved {new Date(brief.createdAt).toLocaleDateString('en-GB')}</span><span>{brief.estimate ? 'Indicative GHS ' + money(brief.estimate) : 'Custom scope'}</span></div><p className="price-snapshot-note">{getBriefPricing(brief).notice}</p><p>{brief.description}</p>
          <details className="brief-details"><summary>View brief details <ArrowRight size={16} /></summary><dl><dt>Requested date</dt><dd>{brief.deadline}</dd><dt>Budget range</dt><dd>{brief.budget}</dd><dt>Contact</dt><dd>{brief.name} · {brief.email}</dd><dt>Organisation</dt><dd>{brief.organisation || 'Not specified'}</dd></dl><h4>Requested support</h4><ul>{brief.selections.length ? getBriefPricing(brief).lines.map(item => <li key={item.id}>{item.quantity} × {item.title}</li>) : <li>Advice on a custom scope</li>}</ul></details>
          <div className="brief-actions"><PdfDownload key={JSON.stringify(brief)} createPdf={() => createBrief(brief)} filename={`Fullview-Signature-research-brief-${brief.id}.pdf`} label="Prepare brief PDF" className="text-link"/>{deleteId === brief.id ? <div className="delete-confirm"><span>Remove this saved brief?</span><button disabled={busy} onClick={() => void remove(brief.id)}>Remove</button><button onClick={() => setDeleteId('')}>Keep brief</button></div> : <button className="icon-button" aria-label={`Remove ${brief.title}`} onClick={() => setDeleteId(brief.id)}><Trash2 size={18} /></button>}</div><InquiryHandoff brief={brief}/>
        </article>)}</div> : <div className="empty-state"><FileText size={38} strokeWidth={1} /><h3>Your next chapter is unwritten.</h3><p>Create a brief to bring your question, scope and timeline together.</p><button className="button" onClick={newBrief}>Create my first brief <Plus size={17} /></button></div>}
      </div> : <div id="desk-create-panel" role="tabpanel" aria-labelledby="desk-create-tab">
        {step === 4 && receipt ? <div className="receipt-panel" ref={stepRef}><CheckCircle2 size={46} strokeWidth={1.2} /><span className="eyebrow">{viewer ? 'BRIEF SAVED' : 'SAVED ON THIS DEVICE'} · {receipt.id}</span><h2 tabIndex={-1}>A thoughtful<br /><em>first step.</em></h2><p>Your brief for <strong>{receipt.title}</strong> is saved. Download a PDF copy for your records.</p><p className="muted-info">{viewer ? 'Your request is recorded in your signed-in desk.' : 'This brief has not been sent to Fullview. It stays in this browser; clearing browser data will remove it.'} No consultation or payment has been booked.</p><div className="hero-buttons"><button className="button" onClick={() => setTab('projects')}>View my briefs <ArrowRight size={17} /></button><PdfDownload key={JSON.stringify(receipt)} createPdf={() => createBrief(receipt)} filename={`Fullview-Signature-research-brief-${receipt.id}.pdf`} label="Prepare brief PDF" className="text-link"/></div><InquiryHandoff brief={receipt}/><button className="text-link" onClick={newBrief}>Create another brief <Plus size={17} /></button></div> : <div className="brief-form-layout">
          <div className="brief-form" ref={stepRef}><div className="form-steps">{['Your project', 'The details', 'Review & save'].map((label, index) => <div key={label} className={step === index + 1 ? 'current' : step > index + 1 ? 'complete' : ''} aria-current={step === index + 1 ? 'step' : undefined}><span>{step > index + 1 ? <Check size={14} /> : index + 1}</span>{label}</div>)}</div>
            <form onSubmit={submit}>
              {step === 1 && <><span className="eyebrow">01 — THE BIG PICTURE</span><h2 tabIndex={-1}>What are you<br /><em>working towards?</em></h2><AudienceSelect /><label className="field">Working project title *<input required minLength={8} maxLength={200} value={form.title} onChange={event => setField('title', event.target.value)} placeholder="A question, a study, a decision to inform…" /></label><label className="field">Tell us about the research *<textarea rows={6} required minLength={40} maxLength={6000} value={form.description} onChange={event => setField('description', event.target.value)} placeholder="Describe the problem, objectives, current stage and support you need." /><small>{form.description.length}/6,000 characters · Minimum 40</small></label><div className="muted-info"><ShieldCheck size={18} /><span>A high-level description is enough. Keep participant identities and confidential datasets out of your brief.</span></div></>}
              {step === 2 && <><span className="eyebrow">02 — THE PRACTICAL DETAILS</span><h2 tabIndex={-1}>Let’s make<br /><em>the picture clearer.</em></h2><div className="form-grid"><label className="field">Your full name *<input required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={event => setField('name', event.target.value)} /></label><label className="field">Email address *<input type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={event => setField('email', event.target.value)} /></label></div><label className="field">University / organisation<input maxLength={200} autoComplete="organization" value={form.organisation} onChange={event => setField('organisation', event.target.value)} placeholder="Optional" /></label><div className="form-grid"><label className="field">Requested completion date *<input type="date" required min={localDate()} value={form.deadline} onChange={event => setField('deadline', event.target.value)} /><small>Subject to scope and availability</small></label><label className="field">Your budget range<select value={form.budget} onChange={event => setField('budget', event.target.value)}>{budgets.map(budget => <option key={budget}>{budget}</option>)}</select></label></div><p className="fine-print">These details appear on your brief. {viewer ? 'Saving does not send an email or book a consultation.' : 'They stay in this browser until you choose to share your downloaded PDF.'}</p></>}
              {step === 3 && <><span className="eyebrow">03 — A CONSIDERED START</span><h2 tabIndex={-1}>Ready to<br /><em>frame the work?</em></h2><div className="review-brief"><h3>{form.title}</h3><span className="status-tag">{audiences.find(item => item.id === audience)?.label}</span><p>{form.description}</p><dl><dt>Contact</dt><dd>{form.name} · {form.email}</dd><dt>Organisation</dt><dd>{form.organisation || 'Not specified'}</dd><dt>Requested date</dt><dd>{form.deadline}</dd><dt>Budget</dt><dd>{form.budget}</dd></dl></div><label className="consent-field"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I understand the <button type="button" onClick={() => policy('integrity')}>research integrity standard</button> and <button type="button" onClick={() => policy('privacy')}>privacy information</button>. {viewer ? 'Saving does not confirm a booking or payment.' : 'This saves a copy on this device; it does not send my brief or confirm a booking.'}</span></label></>}
              {error && <div className="form-error" role="alert" tabIndex={-1}>{error}</div>}
              <div className="form-navigation">{step > 1 ? <button type="button" className="text-link" onClick={() => { setStep(step - 1); setError(''); }}><ArrowLeft size={17} /> Back</button> : <span className="fine-print">* Required fields</span>}<button className="button" type="submit" disabled={busy || !ready || packageChanged}>{busy ? 'Saving your brief…' : step === 3 ? viewer ? 'Save my research brief' : 'Save on this device' : 'Continue'}{!busy && <ArrowRight size={17} />}</button></div>
              <PdfDownload key={JSON.stringify([form,audience,items])} createPdf={() => createBrief()} filename="Fullview-Signature-research-brief-draft.pdf" label="Prepare current draft PDF" className="text-link desk-draft-download" disabled={!form.title.trim() || packageChanged}/>
            </form>
          </div>
          <aside className="scope-summary"><span className="eyebrow">YOUR STARTING SCOPE</span><h3>A project,<br /><em>taking shape.</em></h3>{items.length ? <><ul>{items.map(item => <li key={item.id}><span>{services.find(service => service.id === item.id)?.title}<small>{item.quantity} unit{item.quantity !== 1 ? 's' : ''}</small></span><strong>GHS {money(rate(services.find(service => service.id === item.id)!, audience) * item.quantity)}</strong></li>)}</ul><div className="scope-total"><span>Indicative subtotal</span><strong>GHS {money(total)}</strong></div></> : <div className="custom-scope"><FileText size={30} strokeWidth={1} /><p>Describe what you need, or add services to see an indicative estimate.</p></div>}<a className="text-link" href="/services">{items.length ? 'Add or change services' : 'Explore research services'} <ArrowRight size={17} /></a><div className="summary-note"><ShieldCheck size={22} strokeWidth={1.3} /><p>{form.packageRequest ? 'Package pricing for the listed scope.' : 'Proposed launch pricing.'} Final scope, fees, timing and applicable taxes require agreement. No payment is collected here.</p></div></aside>
        </div>}
      </div>}
    </section>
  </>;
}
