import {savedDate, savedMoney, savedText, submittedBriefSummary} from '../lib/submitted-brief';

const fieldLabels = {title: 'Submitted title', name: 'Client', email: 'Contact email', organisation: 'Organisation', deadline: 'Requested completion', budget: 'Budget guidance'} as const;

export function SubmittedBrief({brief, description, expiresAt}: {brief: Record<string, unknown>; description: string; expiresAt: string}) {
  const saved = submittedBriefSummary(brief);
  const {pricing} = saved;
  return <section className="operations-card" aria-label="Submitted brief">
    <h3>Submitted brief</h3>
    <p className="operations-copy">{savedText(brief.description) ?? description}</p>
    <dl>{Object.entries(fieldLabels).map(([field, label]) => savedText(brief[field]) ? <div key={field}><dt>{label}</dt><dd className="operations-copy">{savedText(brief[field])}</dd></div> : null)}
      <div><dt>Research pathway</dt><dd>{saved.pathway}</dd></div>
    </dl>
    {saved.packageSelection && <div className="operations-details"><h4>Saved package selection</h4><p>{saved.packageSelection.title ?? saved.packageSelection.id}</p><dl><div><dt>Package reference</dt><dd>{saved.packageSelection.id}</dd></div><div><dt>Package client level</dt><dd>{saved.packageSelection.pathway}</dd></div></dl>
      {saved.packageSelection.addOns.length ? <><h5>Selected optional extras</h5><ul>{saved.packageSelection.addOns.map(extra => <li key={extra.id}>{extra.title} — quantity {extra.quantity}</li>)}</ul></> : <p>No optional extras were selected.</p>}
      <p className="fine-print">Package limits, exclusions and revisions remain as recorded in the submitted description.</p>
    </div>}
    {saved.packageNotice && <p className="muted-info" role="alert">{saved.packageNotice}</p>}
    <h4>Submitted services and planning estimate</h4>
    {pricing.status === 'saved' ? <>
      {pricing.snapshot.lines.length ? <><div className="operations-table-wrap" role="region" aria-label="Saved service estimate" tabIndex={0}><table className="operations-table"><caption>Service quantities and rates saved at submission</caption><thead><tr><th scope="col">Service</th><th scope="col">Quantity</th><th scope="col">Unit</th><th scope="col">Unit rate</th><th scope="col">Line total</th></tr></thead><tbody>{pricing.snapshot.lines.map(line => <tr key={line.id}><th scope="row">{line.title}{line.deliverables.length > 0 && <details className="operations-details"><summary>Saved deliverables</summary><ul>{line.deliverables.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}</th><td>{line.quantity}</td><td>{line.unit}</td><td>{savedMoney(line.unitPrice)}</td><td>{savedMoney(line.quantity * line.unitPrice)}</td></tr>)}</tbody></table></div><p><strong>Saved planning total: {savedMoney(pricing.total)}</strong></p></> : <p>No services were selected. Pricing remains to be scoped.</p>}
      <p className="fine-print">Prices and deliverables saved {savedDate(pricing.snapshot.capturedAt)}. Currency: {pricing.snapshot.currency}. This planning estimate is not an accepted quote.</p>
      {pricing.warning && <p className="muted-info" role="alert">{pricing.warning}</p>}
    </> : <>
      <p className="muted-info" role={pricing.status === 'invalid' ? 'alert' : undefined}>{pricing.notice}</p>
      {saved.selections ? saved.selections.length ? <ul aria-label="Recorded service references">{saved.selections.map(item => <li key={item.id}>Service reference: {item.id} — quantity {item.quantity}</li>)}</ul> : <p>No services were selected.</p> : <p>The original service selections are unavailable or malformed.</p>}
      {pricing.recordedTotal !== null && <p>Recorded planning total: <strong>{savedMoney(pricing.recordedTotal)}</strong><br/><span className="fine-print">The original item-price breakdown is unavailable, so this recorded total cannot be checked here.</span></p>}
    </>}
    <p className="fine-print">Retention review date: {savedDate(expiresAt)}. Requested dates and planning estimates do not establish an accepted engagement.</p>
  </section>;
}
