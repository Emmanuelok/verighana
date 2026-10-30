'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight, Check, Download, Layers3, Search, SlidersHorizontal, X} from 'lucide-react';
import {audiences, money, rate, services, type Audience, type Selection} from '../lib/catalog';
import {bundleAuthorshipNotice, bundlePricingNotice, getBundle, quoteBundle, serviceBundles, type ServiceBundle} from '../lib/service-bundles';
import {bundleDeskUrl} from '../lib/bundle-handoff';
import {Dialog} from './research-context';
import {packagePdfUrl} from '../lib/package-pdf';

export function BundleCatalogue() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [compared, setCompared] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selected, setSelected] = useState<ServiceBundle | null>(null);
  const [message, setMessage] = useState('');
  const categories = [...new Set(serviceBundles.map(bundle => bundle.category))];
  const filtered = serviceBundles.filter(bundle => (category === 'all' || bundle.category === category) &&
    `${bundle.title} ${bundle.summary} ${bundle.items.map(item => item.scope).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  function compare(id: string) {
    if (compared.includes(id)) { setCompared(compared.filter(value => value !== id)); setMessage(''); return; }
    if (compared.length === 3) { setMessage('Compare up to three packages. Remove one to add another.'); return; }
    setCompared([...compared, id]); setMessage('');
  }
  return <>
    <section className="bundle-hero wrap">
      <div><span className="eyebrow"><span className="line"/> THE FULLVIEW PACKAGE COLLECTION</span>
        <h1>A complete pathway.<br/><em>One clear price.</em></h1>
        <p>Bring the right expertise together for a defined milestone. Compare the scope, choose your research level and shape a package around the work ahead.</p>
        <a href="#bundle-collection" className="button">Find your package <ArrowRight size={18}/></a>
      </div>
      <div className="bundle-hero-note"><Layers3 size={42} strokeWidth={1}/><span className="eyebrow">CLARITY, FROM THE START</span><h2>Scope.<br/>Support.<br/><em>Next steps.</em></h2><p>{serviceBundles.length} considered packages for students, scholars and organisations.</p></div>
    </section>
    <div className="bundle-draft wrap" role="note"><strong>Defined scope · Clear package pricing</strong><p>Each price covers the listed quantities at the selected client level. Availability, timing and the written engagement are confirmed before work begins. Taxes and external costs are excluded; no discount is claimed. No payment is collected here.</p></div>
    <section id="bundle-collection" className="bundle-collection wrap" aria-label="Package catalogue">
      <div className="bundle-filters"><label className="bundle-search"><Search size={19}/><span className="sr-only">Search packages</span><input type="search" placeholder="Dissertation, journal, business…" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <label className="bundle-category"><SlidersHorizontal size={18}/><span className="sr-only">Package category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All purposes</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="bundle-results"><p aria-live="polite">{filtered.length} package{filtered.length !== 1 ? 's' : ''}</p><button className="text-link" disabled={compared.length < 2} onClick={() => setComparisonOpen(true)}>Compare selected ({compared.length}/3) <ArrowRight size={17}/></button></div>
      {message && <p role="status" className="muted-info">{message}</p>}
      {filtered.length ? <div className="bundle-grid">{filtered.map((bundle, index) => <article key={bundle.id} className="bundle-card">
        <div className="bundle-card-top"><span className="eyebrow">{bundle.category}</span><span className="bundle-number">{String(index + 1).padStart(2, '0')}</span></div>
        <h2>{bundle.title}</h2><p>{bundle.summary}</p>
        <div className="bundle-price"><span>PACKAGE TOTAL</span><strong>GHS {money(quoteBundle(bundle.id, bundle.defaultAudience).total)}</strong><small>{audiences.find(item => item.id === bundle.defaultAudience)?.label} · Base scope</small></div>
        <ul>{bundle.deliverables.map(value => <li key={value}><Check size={16}/><span>{value}</span></li>)}</ul>
        <div className="bundle-card-actions"><button className="button outline full" onClick={() => setSelected(bundle)}>Explore & configure <ArrowRight size={17}/></button>
          <label className="bundle-compare"><input type="checkbox" checked={compared.includes(bundle.id)} onChange={() => compare(bundle.id)}/> Compare this package</label></div>
      </article>)}</div> : <div className="empty-state"><Search size={30}/><h2>No matching packages.</h2><p>Try a broader search or explore individual services.</p><button className="button outline" onClick={() => {setQuery(''); setCategory('all');}}>Reset filters</button></div>}
    </section>
    <section className="bundle-principles wrap"><div><span className="eyebrow">BEFORE WE BEGIN</span><h2>Your work.<br/><em>A defined scope.</em></h2></div><div><p>{bundleAuthorshipNotice}</p><p>Each package covers one project and one consolidated correction round. Additional work, external costs and taxes require a separate written agreement.</p><Link className="text-link" href="/services">Need a different combination? Explore individual services <ArrowRight size={17}/></Link></div></section>
    {selected && <Dialog title="Configure your package" onClose={() => setSelected(null)}><BundleConfigurator bundle={selected}/></Dialog>}
    {comparisonOpen && <Dialog title="Compare research packages" onClose={() => setComparisonOpen(false)}><div className="bundle-comparison"><p>Base scopes shown at each package’s stated client level. Select a package to see the price for another eligible level.</p>{compared.map(id => {const bundle = getBundle(id)!; return <article key={id}><div className="flex-between"><h2>{bundle.title}</h2><button className="icon-button" aria-label={`Remove ${bundle.title} from comparison`} onClick={() => setCompared(compared.filter(value => value !== id))}><X size={17}/></button></div><strong>GHS {money(quoteBundle(id, bundle.defaultAudience).total)}</strong><p>{audiences.find(item => item.id === bundle.defaultAudience)?.label}</p><dl><dt>Included scope</dt><dd>{bundle.items.map(item => item.scope).join(' ')}</dd><dt>Proposed timing</dt><dd>{bundle.timeline}</dd><dt>Revisions</dt><dd>{bundle.revisionPolicy}</dd><dt>Excluded</dt><dd>{bundle.exclusions.join(' ')}</dd></dl><button className="button outline" onClick={() => {setComparisonOpen(false); setSelected(bundle);}}>Configure this package <ArrowRight size={17}/></button></article>})}{!compared.length && <p>No packages selected. Close this comparison to choose packages.</p>}</div></Dialog>}
  </>;
}

function BundleConfigurator({bundle}: {bundle: ServiceBundle}) {
  const [audience, setAudience] = useState<Audience>(bundle.defaultAudience);
  const [addOns, setAddOns] = useState<Selection[]>([]);
  const [message, setMessage] = useState('');
  const quote = quoteBundle(bundle.id, audience, addOns);
  return <div className="bundle-configurator"><span className="draft-pill">PACKAGE ESTIMATE · NOT A CONFIRMED QUOTE</span><h2>{bundle.title}</h2><p>{bundle.summary}</p>
    <label className="field">Client level<select value={audience} onChange={event => {setAudience(event.target.value as Audience); setAddOns([]); setMessage('Client level updated; optional extras reset.');}}>{bundle.audiences.map(id => <option key={id} value={id}>{audiences.find(item => item.id === id)?.label}</option>)}</select></label>
    <h3>Included in the package</h3><ol className="bundle-inclusions">{quote.lines.filter(line => line.kind === 'included').map(line => <li key={line.id}><div className="flex-between"><strong>{line.title}</strong><span>GHS {money(line.total)}</span></div><p>{line.scope}</p><small>{line.quantity} × GHS {money(line.unitPrice)} per {line.unit}</small></li>)}</ol>
    <h3>Optional extras</h3><p className="fine-print">Choose whole units within these limits. Larger scopes need a separate quote.</p><div className="bundle-addons">{bundle.addOns.map(addOn => {const service = services.find(item => item.id === addOn.serviceId)!; return <label key={service.id}><span><strong>{service.title}</strong><small>{addOn.note}<br/>GHS {money(rate(service, audience))} per {service.unit}</small></span><select aria-label={`Quantity for add-on ${service.title}`} value={addOns.find(item => item.id === service.id)?.quantity || 0} onChange={event => {const quantity = Number(event.target.value); setAddOns(previous => [...previous.filter(item => item.id !== service.id), ...(quantity ? [{id: service.id, quantity}] : [])]);}}>{Array.from({length: addOn.maxQuantity + 1}, (_, quantity) => <option key={quantity} value={quantity}>{quantity === 0 ? 'None' : quantity}</option>)}</select></label>})}</div>
    <div className="bundle-total" aria-live="polite"><div><span>Base package</span><strong>GHS {money(quote.baseTotal)}</strong></div><div><span>Optional extras</span><strong>GHS {money(quote.addOnTotal)}</strong></div><div><span>Package total</span><strong>GHS {money(quote.total)}</strong></div><small>One project · GHS · Taxes and external costs excluded</small></div>
    <details open className="bundle-scope-details"><summary>Scope, delivery & exclusions</summary><h4>Required from you</h4><ul>{bundle.prerequisites.map(value => <li key={value}>{value}</li>)}</ul><h4>Delivery</h4><p>{bundle.timeline}</p><h4>Revisions</h4><p>{bundle.revisionPolicy}</p><h4>Not included</h4><ul>{bundle.exclusions.map(value => <li key={value}>{value}</li>)}</ul></details>
    <p className="fine-print">{bundlePricingNotice}</p><p className="fine-print">{bundle.pricingRationale}</p>
    <a className="button full" href={bundleDeskUrl({bundleId: bundle.id, audience, addOns})}>Prepare a bundle brief <ArrowRight size={17}/></a>
    <a className="button outline full" href={packagePdfUrl({bundleId: bundle.id, audience, addOns})} download><Download size={17}/>Download package PDF</a>
    {message && <p role="status" className="muted-info">{message}</p>}
  </div>;
}
