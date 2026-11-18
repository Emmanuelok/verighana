'use client';

import Link from 'next/link';
import {useSearchParams} from 'next/navigation';

import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, Clock3, Download, Plus, Search, X} from 'lucide-react';
import {audiences, categories, clientGroupFor, clientGroups, isOrganisation, money, rate, serviceImage, services, type Audience, type Service} from '../lib/catalog';
import {AudienceSelect, downloadText, useResearch} from './research-context';
import {FAQ} from './research-pages';

const featuredOrder = new Map([
  'research-consultation', 'market-research', 'school-digital', 'government-climate', 'quantitative',
  'public-health-systems', 'feasibility', 'ngo-needs', 'grant-review', 'private-process',
  'transcription', 'university-data-management',
].map((id, index) => [id, index]));
const fieldStudies = ['government-investment', 'market-research', 'government-climate'];
const fieldSubjects = ['Infrastructure', 'Markets', 'Climate'];
const pageSize = 12;
const searchDescription = (service: Service) => [
  service.title, service.description, ...service.deliverables, categories.find(item => item.id === service.category)?.title,
].join(' ').toLowerCase();
const serviceRate = (service: Service, audience: Audience) => rate(service, service.audiences.includes(audience) ? audience : service.audiences[0]);

function CollectionCover() {
  const {detail} = useResearch();
  const [index, setIndex] = useState(0);
  const example = services.find(item => item.id === fieldStudies[index])!;
  const photo = serviceImage(example);
  return <header className="fc-cover">
    <div className="fc-bound fc-cover-spread">
      <div className="fc-cover-copy">
        <span className="fc-kicker">Fullview Signature / Catalogue</span>
        <h1>Research<br/><em>services.</em></h1>
        <p>Find a specialist for your question, from designing a study to making sense of the evidence.</p>
        <a className="fc-action fc-citron" href="#service-collection">Explore the index <ArrowDown size={17}/></a>
      </div>
      <figure className="fc-cover-plate">
        <div className="fc-plate-image"><img key={photo.src} src={photo.src} alt={photo.alt} width={1200} height={800} fetchPriority="high"/></div>
        <figcaption>
          <div className="fc-plate-top"><span className="fc-kicker">In the field</span>
            <div className="fc-scene-controls" aria-label="Select a research setting">{fieldSubjects.map((label, i) =>
              <button key={label} type="button" aria-label={label} aria-pressed={i === index} onClick={() => setIndex(i)}>{String(i + 1).padStart(2, '0')}</button>)}</div>
          </div>
          <button className="fc-plate-link" onClick={() => detail(example)} aria-label={'Explore ' + example.title}>{example.title}<ArrowUpRight size={20}/></button>
        </figcaption>
      </figure>
    </div>
  </header>;
}

export function ServiceCatalogue() {
  const query = useSearchParams()?.toString() || '';
  return <ServiceIndex key={query} request={query}/>;
}

function ServiceIndex({request}: {request: string}) {
  const {audience, setAudience, items, estimate} = useResearch();
  const params = new URLSearchParams(request);
  const path = params.get('audience') as Audience;
  const entryGroup = clientGroups.find(item => item.id === params.get('client')) ?? clientGroupFor(path);
  const entryAudience = entryGroup ? (entryGroup.audiences.includes(path) ? path : entryGroup.defaultAudience)
    : audiences.find(item => item.id === path)?.id;
  const [group, setGroup] = useState(entryGroup?.id ?? 'all');
  const [category, setCategory] = useState(categories.find(item => item.id === params.get('category'))?.id || 'all');
  const [query, setQuery] = useState(params.get('q') || '');
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);
  const resultStart = useRef<HTMLDivElement>(null);
  const updateAudience = useRef(setAudience);
  useEffect(() => { updateAudience.current = setAudience; }, [setAudience]);
  useEffect(() => {
    if (!entryAudience) return;
    let active = true;
    // An explicit pathway takes precedence once the provider finishes restoring browser state.
    queueMicrotask(() => { if (active) updateAudience.current(entryAudience); });
    return () => { active = false; };
  }, [entryAudience]);

  const activeGroup = clientGroups.find(item => item.id === group);
  const scoped = useMemo(() => services.filter(service => {
    if (!activeGroup) return true;
    if (['students', 'researchers'].includes(group) && activeGroup.audiences.includes(audience)) return service.audiences.includes(audience);
    return service.audiences.some(level => activeGroup.audiences.includes(level));
  }), [activeGroup, group, audience]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const found = scoped.filter(service => (category === 'all' || category === service.category) && searchDescription(service).includes(term));
    if (sort === 'name') return found.sort((a, b) => a.title.localeCompare(b.title));
    if (sort.startsWith('price-')) {
      const direction = sort === 'price-asc' ? 1 : -1;
      return found.sort((a, b) => direction * (serviceRate(a, audience) - serviceRate(b, audience)));
    }
    if (sort === 'featured') return found.sort((a,b) => (featuredOrder.get(a.id) ?? 100) - (featuredOrder.get(b.id) ?? 100));
    return found;
  }, [scoped, category, query, sort, audience]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const shown = filtered.slice(start, start + pageSize);
  function selectGroup(id: string) {
    setGroup(id); setCategory('all'); setPage(1);
    const selected = clientGroups.find(item => item.id === id);
    if (selected) setAudience(selected.defaultAudience);
  }
  function reset() { setGroup('all'); setCategory('all'); setQuery(''); setPage(1); }
  function turnPage(next: number) {
    setPage(next);
    resultStart.current?.scrollIntoView({block: 'start', behavior: 'instant'});
    resultStart.current?.focus({preventScroll: true});
  }
  return <div className="field-catalogue">
    <CollectionCover/>
    <section className="fc-bound fc-index" id="service-collection" aria-labelledby="fc-index-title">
      <div className="fc-section-top"><div><span className="fc-kicker">Browse by expertise</span><h2 id="fc-index-title">The service index<span>.</span></h2></div>
        <button className="fc-action fc-dark" onClick={estimate}>My estimate <span className="fc-counter">{items.length}</span></button></div>
      <div className="fc-filters">
        <label className="fc-query"><Search size={19}/><span className="sr-only">Search research services</span><input type="search" value={query} placeholder="Search services, methods or deliverables" onChange={event => {setQuery(event.target.value); setPage(1);}}/></label>
        <label className="fc-select"><span>Client group</span><select value={group} onChange={event => selectGroup(event.target.value)}><option value="all">All client groups</option>{clientGroups.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="fc-select"><span>Area of expertise</span><select value={category} onChange={event => {setCategory(event.target.value); setPage(1);}}><option value="all">All expertise</option>{categories.map(item => {
          const count = scoped.filter(service => service.category === item.id).length;
          return <option key={item.id} value={item.id} disabled={!count}>{item.short} ({count})</option>;
        })}</select></label>
      </div>
      <div className="fc-index-meta" id="catalogue-results" ref={resultStart} tabIndex={-1}>
        <p aria-live="polite"><strong>{filtered.length}</strong> {filtered.length === 1 ? 'service' : 'services'}{activeGroup ? ' for ' + activeGroup.label.toLowerCase() : ''}</p>
        <div className="fc-tools">
          {(group !== 'all' || category !== 'all' || query) && <button className="fc-quiet" onClick={reset}>Clear filters <X size={14}/></button>}
          <AudienceSelect onChange={value => {setGroup(clientGroupFor(value)?.id || 'all'); setCategory('all'); setPage(1);}}/>
          <label className="fc-tool-select"><span>Sort by</span><select value={sort} aria-label="Sort services" onChange={event => {setSort(event.target.value); setPage(1);}}><option value="featured">Featured</option><option value="recommended">Research stage</option><option value="name">Service name</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
        </div>
      </div>
      {shown.length ? <>
        <div className="fc-service-grid">{shown.map((service, i) => <ServiceCard key={service.id} service={service} priority={current === 1 && i < 3}/>)}</div>
        <nav className="fc-pagination" aria-label="Catalogue pages"><span>Showing {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}</span><div>
          <button disabled={current === 1} onClick={() => turnPage(current - 1)} aria-label="Previous catalogue page"><ArrowLeft size={17}/></button><b>Page {current} of {pages}</b><button disabled={current === pages} onClick={() => turnPage(current + 1)} aria-label="Next catalogue page"><ArrowRight size={17}/></button></div></nav>
      </> : <div className="fc-empty"><h3>No matching services.</h3><p>Try another search term, client group or area of expertise.</p><button className="fc-action fc-dark" onClick={reset}>Reset filters <ArrowRight size={16}/></button></div>}
      <div className="fc-related"><div><span className="fc-kicker">Working towards a milestone?</span><h3>Explore research <em>packages.</em></h3></div><Link className="fc-action fc-citron" href="/bundles">Compare packages <ArrowRight size={18}/></Link></div>
      <p className="fc-note">Proposed starting rates are in Ghana cedis (GHS). Final scope, fees, staffing, availability, taxes and timing require a written agreement. External fieldwork, recruitment, travel, software licences and publication charges are excluded unless expressly included. Service photographs are AI-generated illustrations.</p>
    </section>
  </div>;
}

export function ServiceCard({service, priority = false}: {service: Service; priority?: boolean}) {
  const {audience, detail, add, items, estimate} = useResearch();
  const selected = items.some(item => item.id === service.id);
  const photo = serviceImage(service);
  return <article className="fc-service">
    <button className="fc-service-photo" aria-label={'Explore ' + service.title} onClick={() => detail(service)}><img src={photo.src} alt={photo.alt} width={1200} height={800} loading={priority ? 'eager' : 'lazy'}/><span><ArrowUpRight size={17}/></span></button>
    <div className="fc-service-body"><span className="fc-kicker">{categories.find(item => item.id === service.category)?.short}</span>
      <h3><button onClick={() => detail(service)}>{service.title}</button></h3><p>{service.description}</p>
      <span className="fc-timing"><Clock3 size={14}/>{service.days}</span>
      <div className="fc-service-bottom"><div><small>Starting from</small><strong>GHS {money(serviceRate(service, audience))}</strong><span>per {service.unit}</span></div>
        <button className={'fc-add' + (selected ? ' selected' : '')} aria-label={selected ? 'View estimate with ' + service.title : 'Add ' + service.title + ' to estimate'} onClick={() => selected ? estimate() : add(service.id)}>{selected ? <Check size={18}/> : <Plus size={19}/>}</button>
      </div>
    </div>
  </article>;
}

const institutionalPicks: Partial<Record<Audience, string[]>> = {
  government: ['government-policy-options','government-procurement','government-local-planning'],
  public: ['public-service-quality','public-performance','public-workforce'],
  private: ['private-strategy','private-experience','private-process'],
  schools: ['school-improvement','school-learning','school-teacher-learning'],
  university: ['university-curriculum','university-graduate-tracer','university-capacity'],
  nonprofit: ['ngo-needs','ngo-theory-change','ngo-donor-proposal'],
};

export function PricingPage() {
  const {audience, detail, estimate, total, items} = useResearch();
  const [query, setQuery] = useState('');
  const eligible = services.filter(service => service.audiences.includes(audience));
  const currentLabel = audiences.find(item => item.id === audience)?.label;
  const rows = eligible.filter(item => searchDescription(item).includes(query.trim().toLowerCase()));
  const ids = isOrganisation(audience) ? (institutionalPicks[audience] || ['market-research','policy-analysis','team-training']) : ['research-consultation','proposal-review','quantitative'];
  const picks = ids.map(id => eligible.find(item => item.id === id)).filter((item): item is Service => Boolean(item));
  function downloadGuide() {
    const entries = eligible.map(s => s.title + ': from GHS ' + money(rate(s,audience)) + ' / ' + s.unit + '\nTypical timing: ' + s.days + '\n' + s.deliverables.join('; '));
    downloadText('Fullview-Signature-rate-guide.txt', 'FULLVIEW SIGNATURE | BY VERIDANTH GROUP\nPROPOSED LAUNCH RATE GUIDE\nPathway: ' + currentLabel + '\n\n' + entries.join('\n\n') + '\n\nIndicative prices only. Final scope, fees and applicable taxes require written confirmation. No payment is collected here.');
  }
  return <div className="field-catalogue fc-rates">
    <header className="fc-rate-cover"><div className="fc-bound fc-rate-spread">
      <div><span className="fc-kicker">Fullview Signature / Pricing</span><h1>The research<br/><em>rate guide.</em></h1><p>Compare the starting price, scope and timing of each service, then build a budget for your project.</p><a className="fc-action fc-dark" href="#rate-index">Browse the rates <ArrowDown size={17}/></a></div>
      <aside className="fc-rate-ticket"><div className="fc-ticket-top"><span className="fc-kicker">Project estimate</span><span>GHS</span></div>
        <span className="fc-ticket-label">Your indicative subtotal</span><strong>{money(total)}</strong><span>{items.length} selected {items.length === 1 ? 'service' : 'services'}</span>
        <button className="fc-ticket-link" onClick={estimate}>Open my estimate <ArrowRight size={18}/></button></aside>
    </div></header>
    <section className="fc-bound fc-rate-index" id="rate-index" aria-labelledby="rate-heading">
      <div className="fc-section-top"><div><span className="fc-kicker">Prices in Ghana cedis</span><h2 id="rate-heading">Service rates<span>.</span></h2></div><button className="fc-quiet" onClick={downloadGuide}><Download size={17}/> Download rate guide</button></div>
      <div className="fc-rate-bar"><AudienceSelect/><label className="fc-query"><Search size={18}/><input type="search" aria-label="Search service rates" placeholder="Search this rate guide" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
      <p className="fc-row-count" aria-live="polite">{rows.length} {rows.length === 1 ? 'service' : 'services'} for {currentLabel?.toLowerCase()}</p>
      {rows.length ? <div className="fc-rate-ledger"><table><thead><tr><th>Service / starting scope</th><th>Typical timing</th><th>From (GHS)</th><th><span className="sr-only">Service details</span></th></tr></thead>
        <tbody>{rows.map(service => <tr key={service.id}><th scope="row"><button onClick={() => detail(service)}>{service.title}</button><small>per {service.unit}</small></th><td>{service.days}</td><td>{money(rate(service,audience))}</td><td><button className="fc-row-arrow" onClick={() => detail(service)} aria-label={'View ' + service.title}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table></div> : <div className="fc-empty"><h3>No matching rates.</h3><button className="fc-quiet" onClick={() => setQuery('')}>Clear search <X size={15}/></button></div>}
      <p className="fc-note">Rates cover the stated starting scope. Academic-level adjustments are planning assumptions. Taxes, fieldwork, recruitment, travel, software licences, journal fees and venue hire are excluded unless expressly included. Fullview confirms fees, timing and revision terms in writing.</p>
    </section>
    {picks.length > 0 && <section className="fc-bound fc-shortlist"><div className="fc-section-top"><div><span className="fc-kicker">For your pathway</span><h2>Scopes at a glance<span>.</span></h2></div><a className="fc-quiet" href={'/services?audience=' + audience}>All services <ArrowUpRight size={16}/></a></div><div className="fc-example-grid">{picks.map(service => <article key={service.id}><img src={serviceImage(service).src} alt={serviceImage(service).alt} loading="lazy" width={800} height={533}/><div><h3>{service.title}</h3><ul>{service.deliverables.map(item => <li key={item}>{item}</li>)}</ul><button className="fc-quiet" onClick={() => detail(service)}>View scope <ArrowUpRight size={16}/></button></div></article>)}</div></section>}
    <FAQ/>
    <div className="fc-bound fc-related fc-rate-related"><div><span className="fc-kicker">Multiple services, one milestone</span><h3>Consider a research <em>package.</em></h3></div><Link className="fc-action fc-citron" href="/bundles">Compare packages <ArrowRight size={18}/></Link></div>
  </div>;
}
