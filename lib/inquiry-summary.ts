import {audiences, money} from './catalog';
import {getBriefPricing, type Brief} from './local-briefs';

/** Prepared locally for the client to send through their existing contact channel. */
export function inquirySummary(brief: Brief): string {
  const pricing = getBriefPricing(brief);
  return [`Subject: Research inquiry — ${brief.title || 'New project'}`, '',
    'Hello Fullview Signature,', 'Please review the following proposed scope and confirm suitability, availability and a written quote.', '',
    `Project: ${brief.title}`, `Pathway: ${audiences.find(item => item.id === brief.audience)?.label || brief.audience}`,
    `Contact: ${brief.name || 'To be completed'} · ${brief.email || 'To be completed'}`, `Organisation: ${brief.organisation || 'Not specified'}`,
    `Requested date: ${brief.deadline || 'To be agreed'}`, `Budget: ${brief.budget}`, '', brief.description, '',
    'Requested support:', ...pricing.lines.map(line => `${line.quantity} × ${line.title} — GHS ${money(line.quantity * line.unitPrice)}`),
    `Planning subtotal: ${pricing.lines.length ? 'GHS ' + money(pricing.total) : 'To be scoped'}`, pricing.notice, '',
    'Draft inquiry only. No booking, accepted quote or payment commitment. Final scope, fees, tax, delivery and revisions require written agreement.',
  ].join('\n');
}
