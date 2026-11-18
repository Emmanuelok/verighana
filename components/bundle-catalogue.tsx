'use client';

import Link from 'next/link';

import {useState} from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, Download, Search, X} from 'lucide-react';
import {audiences, money, rate, serviceImage, services, type Audience, type Selection} from '../lib/catalog';
import {bundleAuthorshipNotice, bundlePricingNotice, getBundle, quoteBundle, serviceBundles, type ServiceBundle} from '../lib/service-bundles';
import {bundleDeskUrl} from '../lib/bundle-handoff';
import {Dialog} from './research-context';
import {packagePdfUrl} from '../lib/package-pdf';

const coverService: Record<string,string> = {
  'dissertation-proposal': 'proposal-review',
  'dissertation-quantitative': 'quantitative',
  'dissertation-qualitative': 'qualitative',
  'journal-readiness': 'manuscript-review',
  'business-evidence': 'market-research',
  'policy-decision': 'government-local-planning',
  'institutional-measurement': 'public-performance',
  'ngo-funding-evidence': 'ngo-outcomes',
  'school-improvement': 'school-improvement',
};

function bundlePhoto(bundle: ServiceBundle) {
  return serviceImage(services.find(item => item.id === coverService[bundle.id])!);
}

const frontCovers = ['business-evidence', 'journal-readiness', 'ngo-funding-evidence']
  .map(id => getBundle(id)!);

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
  const [featureIndex, setFeatureIndex] = useState(0);
  const feature = frontCovers[featureIndex];
  const featurePhoto = bundlePhoto(feature);
  return <div className="field-catalogue fc-bundles">
    <header className="fc-package-cover"><div className="fc-bound fc-package-spread">
      <div className="fc-package-copy"><span className="fc-kicker">Fullview Signature / Packages</span>
        <h1>Research<br/><em>packages.</em></h1>
        <p>Bring the right services together for a dissertation, publication or organisational decision. Choose a defined scope and adapt it to your needs.</p>
        <a href="#bundle-collection" className="fc-action fc-dark">Browse all packages <ArrowDown size={17}/></a>
      </div>
      <div className="fc-package-feature">
        <div className="fc-package-cover-photo"><img key={feature.id} src={featurePhoto.src} alt={featurePhoto.alt} width={1200} height={800} fetchPriority="high"/></div>
        <div className="fc-feature-footer"><div><span className="fc-kicker">{feature.category} package</span>
          <button className="fc-plate-link" onClick={() => setSelected(feature)}>{feature.title} <ArrowUpRight size={17}/></button></div>
          <div className="fc-feature-step"><button aria-label="Previous featured package" onClick={() => setFeatureIndex(i => (i + frontCovers.length - 1) % frontCovers.length)}><ArrowLeft size={16}/></button><button aria-label="Next featured package" onClick={() => setFeatureIndex(i => (i + 1) % frontCovers.length)}><ArrowRight size={16}/></button></div>
        </div>
      </div>
    </div></header>
    <section className="fc-bound fc-packages" id="bundle-collection" aria-label="Package catalogue">
      <div className="fc-section-top"><div><span className="fc-kicker">The collection</span><h2>Choose a package<span>.</span></h2></div>
        <Link className="fc-quiet" href="/services">Individual services <ArrowUpRight size={17}/></Link></div>
      <div className="fc-package-filters">
        <label className="fc-query"><Search size={19}/><span className="sr-only">Search packages</span><input type="search" placeholder="Search packages or deliverables" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <label className="fc-select"><span>Package category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All purposes</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <p className="fc-row-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'package' : 'packages'} available</p>
      {filtered.length ? <div className="fc-package-grid">{filtered.map(bundle => {
        const photo = bundlePhoto(bundle);
        return <article key={bundle.id} className="fc-package-card">
          <button className="fc-package-photo" onClick={() => setSelected(bundle)} aria-label={'Configure ' + bundle.title}><img src={photo.src} alt={photo.alt} loading="lazy" width={1200} height={800}/><span className="fc-category-tab">{bundle.category}</span></button>
          <div className="fc-package-body"><h3>{bundle.title}</h3><p>{bundle.summary}</p>
            <div className="fc-package-price"><span>Base package</span><strong>GHS {money(quoteBundle(bundle.id, bundle.defaultAudience).total)}</strong><small>{audiences.find(item => item.id === bundle.defaultAudience)?.label} · {bundle.items.length} services</small></div>
            <details className="fc-included"><summary>What’s included</summary><ul>{bundle.deliverables.map(value => <li key={value}><Check size={14}/>{value}</li>)}</ul></details>
            <button className="fc-action fc-dark" onClick={() => setSelected(bundle)}>Explore &amp; configure <ArrowRight size={17}/></button>
            <label className="fc-compare-check"><input type="checkbox" checked={compared.includes(bundle.id)} onChange={() => compare(bundle.id)}/> Compare this package</label>
          </div>
        </article>;
      })}</div> : <div className="fc-empty"><h3>No matching packages.</h3><p>Try another search or browse all purposes.</p><button className="fc-quiet" onClick={() => {setQuery(''); setCategory('all');}}>Reset filters <X size={16}/></button></div>}
      {compared.length > 0 && <aside className="fc-compare-tray" aria-label="Package comparison">
        <div role="status"><strong>{compared.length} of 3 selected</strong><span>{message || (compared.length === 1 ? 'Choose another package to compare.' : 'Compare the scope, price and delivery.')}</span></div>
        <button className="fc-action fc-citron" disabled={compared.length < 2} onClick={() => setComparisonOpen(true)}>Compare selected <ArrowRight size={16}/></button>
        <button className="fc-tray-clear" aria-label="Clear package comparison" onClick={() => {setCompared([]); setMessage('');}}><X size={16}/></button>
      </aside>}
      <div className="fc-package-terms"><h3>Before you <em>commission.</em></h3><div>
        <p>Each package covers one project, the listed service quantities and one consolidated correction round. Availability, timing, applicable taxes and external costs are confirmed in writing before work begins. No payment is collected here.</p>
        <details><summary>Academic authorship and integrity</summary><p>{bundleAuthorshipNotice}</p></details></div></div>
    </section>
    {selected && <Dialog title="Configure your package" onClose={() => setSelected(null)}><BundleConfigurator bundle={selected}/></Dialog>}
    {comparisonOpen && <Dialog title="Compare research packages" onClose={() => setComparisonOpen(false)}><div className="bundle-comparison"><p>Base scopes shown at each package’s stated client level. Select a package to see the price for another eligible level.</p>{compared.map(id => {const bundle = getBundle(id)!; return <article key={id}><div className="flex-between"><h2>{bundle.title}</h2><button className="icon-button" aria-label={`Remove ${bundle.title} from comparison`} onClick={() => setCompared(compared.filter(value => value !== id))}><X size={17}/></button></div><strong>GHS {money(quoteBundle(id, bundle.defaultAudience).total)}</strong><p>{audiences.find(item => item.id === bundle.defaultAudience)?.label}</p><dl><dt>Included scope</dt><dd>{bundle.items.map(item => item.scope).join(' ')}</dd><dt>Proposed timing</dt><dd>{bundle.timeline}</dd><dt>Revisions</dt><dd>{bundle.revisionPolicy}</dd><dt>Excluded</dt><dd>{bundle.exclusions.join(' ')}</dd></dl><button className="button outline" onClick={() => {setComparisonOpen(false); setSelected(bundle);}}>Configure this package <ArrowRight size={17}/></button></article>})}{!compared.length && <p>No packages selected. Close this comparison to choose packages.</p>}</div></Dialog>}
  </div>;
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
