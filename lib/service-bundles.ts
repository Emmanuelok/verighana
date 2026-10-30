import {audiences, rate, services, type Audience, type Selection} from './catalog';

/** Owner-approved package scopes and prices for publication. */
export const bundlePricingStatus = 'published' as const;
export const bundlePricingNotice = 'Package pricing covers the stated scope and selected client level, subject to availability and a written engagement. Not a booking, invoice or payment request. Taxes and external costs are not included; any applicable amounts must be confirmed in the written quote.';
export const bundleAuthorshipNotice = 'You retain authorship and responsibility for your work. Academic packages provide coaching, analysis and editing of your own material. They exclude ghostwriting, fabricated data or references, impersonation and guaranteed grades, funding or publication.';

export type BundleItem = Selection & {scope: string};
export type BundleAddOn = {serviceId: string; maxQuantity: number; note: string};
export type ServiceBundle = {
  id: string;
  title: string;
  summary: string;
  category: 'Dissertation' | 'Publication' | 'Business' | 'Policy' | 'Institutional' | 'Development' | 'Education';
  audiences: Audience[];
  defaultAudience: Audience;
  items: BundleItem[];
  deliverables: string[];
  prerequisites: string[];
  exclusions: string[];
  revisionPolicy: string;
  timeline: string;
  addOns: BundleAddOn[];
  pricingRationale: string;
};

const students: Audience[] = ['undergraduate', 'masters', 'phd'];
const organisations: Audience[] = ['business', 'institution', 'government', 'public', 'private', 'schools', 'university', 'nonprofit'];
const revisionPolicy = 'One consolidated clarification or correction round on the supplied material, requested within 14 calendar days of delivery. New questions, datasets, chapters or a changed scope require a separate quote.';
const pricingRationale = 'The package price is the sum of the existing catalogue rates for the stated units and selected client level. No discount or prior selling price is claimed. Scope, timing and availability are confirmed in the written engagement.';
const item = (id: string, quantity: number, scope: string): BundleItem => ({id, quantity, scope});
const addOn = (serviceId: string, maxQuantity: number, note: string): BundleAddOn => ({serviceId, maxQuantity, note});

export const serviceBundles: ServiceBundle[] = [
  {
    id: 'dissertation-proposal', title: 'Dissertation Proposal Pathway', category: 'Dissertation',
    summary: 'Turn your own research idea and draft proposal into a coherent, feasible study plan.',
    audiences: students, defaultAudience: 'masters',
    items: [
      item('topic-development', 1, 'One clinic reviewing up to 3 candidate topics for one study.'),
      item('proposal-review', 1, 'One author-written proposal of up to 5,000 words, with annotated feedback and one discussion.'),
      item('methodology', 1, 'One study-design consultation with options and recommendations.'),
      item('search-strategy', 1, 'One research question, search strings and a search-log template.'),
      item('ethics', 1, 'One draft application and its participant information and consent documents reviewed.'),
    ],
    deliverables: ['Refined question and feasibility feedback', 'Annotated proposal and methods recommendations', 'Reproducible search plan and ethics-review checklist'],
    prerequisites: ['Your candidate questions and draft proposal', 'Institutional requirements, deadline and available data or recruitment plan'],
    exclusions: ['Writing the proposal or literature review for submission', 'Executing a full literature review, participant recruitment or fieldwork', 'Ethics submission, fees or approval'],
    revisionPolicy, timeline: 'Proposed 15–20 working days after all inputs and scope are agreed.',
    addOns: [addOn('instruments', 1, 'One instrument: up to 30 survey items or 15 interview prompts.'), addOn('sampling', 1, 'Sample-size and sampling plan for the same study.'), addOn('research-consultation', 2, 'Additional 60-minute coaching sessions.')], pricingRationale,
  },
  {
    id: 'dissertation-quantitative', title: 'Dissertation Quantitative Finish', category: 'Dissertation',
    summary: 'Bring a supplied dataset and your own draft through analysis, editorial feedback and defence preparation.',
    audiences: students, defaultAudience: 'masters',
    items: [
      item('research-consultation', 1, 'One 60-minute scope and research-question consultation.'),
      item('data-cleaning', 1, 'One supplied, de-identified dataset of up to 500 rows.'),
      item('quantitative', 1, 'The same dataset: descriptives and up to 3 agreed statistical tests, syntax and interpretation session.'),
      item('developmental-edit', 2, 'Up to 10,000 words total of your existing dissertation draft; 2 units of 5,000 words.'),
      item('proofreading', 10, 'Up to 10,000 words total, checked once after you complete your revisions.'),
      item('references', 2, 'Up to 100 references total in one required style.'),
      item('viva', 1, 'One two-session defence-preparation package based on your abstract and chapter summary.'),
    ],
    deliverables: ['Cleaned data, codebook, cleaning log and reproducible analysis outputs', 'Annotated draft, tracked proofreading and reference consistency review', 'Interpretation discussion, mock defence and preparation notes'],
    prerequisites: ['Lawfully obtained, de-identified data and an agreed analysis question', 'Your own complete draft of up to 10,000 words and institutional guidance'],
    exclusions: ['Writing chapters, supplying findings to submit as your own writing, or collecting data', 'Advanced models, more than 3 tests, additional datasets or more than 500 rows', 'Unlimited rewrites, full language editing, additional words or guaranteed academic outcomes'],
    revisionPolicy, timeline: 'Proposed 20–30 working days; pauses while you revise and session scheduling are additional.',
    addOns: [addOn('statistics-training', 2, 'Two-hour individual software sessions.'), addOn('research-visualisation', 1, 'Up to 5 additional figures from supplied results.'), addOn('academic-edit', 10, 'Language editing per 1,000 words, up to 10,000 words, before the included final proofreading.')], pricingRationale,
  },
  {
    id: 'dissertation-qualitative', title: 'Dissertation Qualitative Finish', category: 'Dissertation',
    summary: 'Make sense of supplied interviews, strengthen your existing draft and prepare to explain your findings.',
    audiences: students, defaultAudience: 'masters',
    items: [
      item('research-consultation', 1, 'One 60-minute scope and research-question consultation.'),
      item('qualitative', 1, 'Up to 5 supplied, de-identified transcripts, capped at 30,000 words total for this package.'),
      item('developmental-edit', 2, 'Up to 10,000 words total of your own dissertation draft; 2 units of 5,000 words.'),
      item('proofreading', 10, 'Up to 10,000 words total, checked once after you complete your revisions.'),
      item('references', 2, 'Up to 100 references total in one required style.'),
      item('viva', 1, 'One two-session defence-preparation package based on your abstract and chapter summary.'),
    ],
    deliverables: ['Initial codebook, thematic framework, evidence matrix and coding debrief', 'Annotated draft, tracked proofreading and reference consistency review', 'Mock defence and personalised preparation notes'],
    prerequisites: ['Consent to use de-identified transcripts and an agreed analytical approach', 'Your own complete draft of up to 10,000 words and institutional guidance'],
    exclusions: ['Recruitment, interviews, transcription and translation in the base package', 'Additional transcripts, more than 30,000 transcript words, or mixed-methods integration', 'Writing chapters, full language editing, unlimited rewrites or guaranteed academic outcomes'],
    revisionPolicy, timeline: 'Proposed 20–30 working days; pauses while you revise and session scheduling are additional.',
    addOns: [addOn('transcription', 300, 'Per audio minute, up to 300 minutes of clear English audio; translation excluded.'), addOn('qualitative-training', 2, 'Two-hour individual methods or coding sessions.'), addOn('research-visualisation', 1, 'Up to 5 figures from the supplied research evidence.')], pricingRationale,
  },
  {
    id: 'journal-readiness', title: 'Journal Submission Readiness', category: 'Publication',
    summary: 'Review, edit and position one manuscript you have written for an informed submission decision.',
    audiences: ['masters', 'phd', 'postdoc', 'academic'], defaultAudience: 'academic',
    items: [
      item('manuscript-review', 1, 'One author-written manuscript of up to 8,000 words.'),
      item('academic-edit', 8, 'Up to 8,000 words of language editing after your substantive revisions.'),
      item('references', 1, 'Up to 50 references in the selected journal style.'),
      item('journal-strategy', 1, 'One manuscript: shortlist of 3 journals, guideline comparison and submission checklist.'),
    ],
    deliverables: ['Independent critique and prioritised revision roadmap', 'Tracked and clean language-edited manuscript', 'Journal-fit comparison and submission checklist'],
    prerequisites: ['Your complete manuscript, figures and reference list', 'Author agreement and any journal preferences or previous review history'],
    exclusions: ['Writing a manuscript, new analysis, new experiments or figure creation', 'Journal fees, account access, submitting on your behalf or later reviewer-response rounds', 'Guaranteed acceptance, indexing, impact factor or publication timing'],
    revisionPolicy, timeline: 'Proposed 15–20 working days, excluding the time you need for substantive revisions.',
    addOns: [addOn('research-visualisation', 1, 'Up to 5 figures from supplied data.'), addOn('research-consultation', 2, 'Additional 60-minute editorial or research-strategy sessions.')], pricingRationale,
  },
  {
    id: 'business-evidence', title: 'Business Opportunity & Customer Evidence', category: 'Business',
    summary: 'Connect a bounded market desk study with a customer-research plan and analysis of supplied evidence.',
    audiences: organisations, defaultAudience: 'business',
    items: [
      item('market-research', 1, 'One Ghanaian market and one product or service; public evidence, segmentation and up to 5 competitors.'),
      item('customer-insights', 1, 'One customer segment; one instrument of up to 30 questions and descriptive analysis of up to 300 supplied responses.'),
    ],
    deliverables: ['Source-linked market and competitor evidence', 'Customer instrument, analysis framework and supplied-data insights', 'Combined decision report up to 25 pages and one 60-minute findings presentation'],
    prerequisites: ['One defined commercial decision, market and customer segment', 'Any client-owned data, with permission for analysis and identifiers removed'],
    exclusions: ['Recruitment, participant incentives, survey distribution, interviews and fieldwork', 'Paid market databases, forecasts sold by third parties or additional geographic markets', 'Investment advice, financial due diligence or guaranteed demand and revenue'],
    revisionPolicy, timeline: 'Proposed 20–30 working days after the agreed evidence is supplied.',
    addOns: [addOn('business-dashboard', 1, 'One dashboard with up to 5 indicators from the agreed dataset; hosting separate.'), addOn('team-training', 1, 'Half-day evidence-use workshop for up to 12 people; venue and travel separate.')], pricingRationale,
  },
  {
    id: 'policy-decision', title: 'Policy Decision & Stakeholder Plan', category: 'Policy',
    summary: 'Combine an evidence-led policy brief with a practical stakeholder and consultation plan.',
    audiences: organisations, defaultAudience: 'government',
    items: [
      item('policy-analysis', 1, 'One Ghanaian policy question and up to 3 policy options using available evidence.'),
      item('stakeholder', 1, 'Up to 15 stakeholder groups, one engagement plan and a synthesis framework; no interviews included.'),
    ],
    deliverables: ['Policy brief up to 15 pages with sources, options and limitations', 'Stakeholder map and consultation design', 'One 60-minute presentation for the commissioning team'],
    prerequisites: ['One policy decision, geographic scope and intended users', 'Available policy documents and permission to review supplied evidence'],
    exclusions: ['Stakeholder recruitment, consultation delivery, travel and fieldwork', 'Primary-data collection, economic modelling, legal opinions or impact evaluation', 'Government endorsement, implementation or a guaranteed policy outcome'],
    revisionPolicy, timeline: 'Proposed 20–25 working days from scope agreement and receipt of inputs.',
    addOns: [addOn('team-training', 1, 'Half-day workshop for up to 12 people on using the agreed evidence; venue and travel separate.'), addOn('business-dashboard', 1, 'One dashboard, up to 5 indicators, from supplied data; hosting separate.')], pricingRationale,
  },
  {
    id: 'institutional-measurement', title: 'Institutional Measurement & Reporting', category: 'Institutional',
    summary: 'Turn one programme’s objectives into a usable measurement framework and a focused dashboard.',
    audiences: organisations, defaultAudience: 'institution',
    items: [
      item('mel', 1, 'One programme or department: results framework with up to 10 indicators and a reporting schedule.'),
      item('business-dashboard', 1, 'One dashboard showing up to 5 agreed indicators from one supplied tabular dataset.'),
    ],
    deliverables: ['Results map, indicator definitions, responsibilities and data-collection plan', 'Dashboard, documentation and handover', 'Learning and review schedule for the programme team'],
    prerequisites: ['Programme objectives, existing indicators and a nominated reporting owner', 'A usable de-identified dataset and agreed dashboard format'],
    exclusions: ['Fieldwork, ongoing data entry, ongoing monitoring or a full impact evaluation', 'Hosting, recurring software subscriptions, live integrations and security or compliance certification', 'Additional programmes, datasets or dashboard pages beyond the agreed scope'],
    revisionPolicy, timeline: 'Proposed 20–25 working days from scope and data confirmation.',
    addOns: [addOn('team-training', 1, 'Half-day reporting and evidence-use workshop for up to 12 people; venue and travel separate.')], pricingRationale,
  },
  {
    id: 'ngo-funding-evidence', title: 'NGO Funding & Learning Evidence', category: 'Development',
    summary: 'Align an existing proposal’s needs case, theory of change and stakeholder learning brief.',
    audiences: ['nonprofit', 'institution'], defaultAudience: 'nonprofit',
    items: [
      item('ngo-donor-proposal', 1, 'One existing proposal of up to 15 pages for one funding call, reviewed against supplied and public evidence.'),
      item('ngo-theory-change', 1, 'One programme workshop, up to 12 people, with an outcome pathway and assumptions map.'),
      item('ngo-knowledge', 1, 'One learning brief of up to 8 pages from the same supplied programme evidence.'),
    ],
    deliverables: ['Needs-evidence source register and proposal feedback', 'Theory-of-change map, assumptions, indicators and learning questions', 'Edited stakeholder learning brief'],
    prerequisites: ['An existing programme proposal, funding-call guidance and programme evidence', 'Available team members for the workshop and a nominated review contact'],
    exclusions: ['Writing a funding application from scratch, application submission or funder representation', 'New fieldwork, outcome verification, workshop venue and travel', 'Guaranteed funding, grant administration or donor reporting beyond the agreed brief'],
    revisionPolicy, timeline: 'Proposed 20–25 working days, subject to workshop scheduling.',
    addOns: [addOn('team-training', 1, 'Half-day research-skills workshop for up to 12 people; venue and travel separate.')], pricingRationale,
  },
  {
    id: 'school-improvement', title: 'School Improvement & Teacher Development', category: 'Education',
    summary: 'Translate one school’s existing evidence into improvement priorities and a teacher-learning plan.',
    audiences: ['schools', 'institution'], defaultAudience: 'schools',
    items: [
      item('school-improvement', 1, 'One school, one improvement cycle and a supplied evidence pack of up to 20 documents.'),
      item('school-teacher-learning', 1, 'One staff cohort of up to 30 teachers: a needs-assessment tool and analysis of supplied responses.'),
    ],
    deliverables: ['School context and needs profile', 'Improvement action framework with monitoring plan', 'Teacher capability priorities and professional learning plan'],
    prerequisites: ['School priorities, de-identified records and a nominated leadership contact', 'Staff participation permissions and supplied needs-assessment responses'],
    exclusions: ['Site visits, survey administration, observations or training delivery', 'Individual learner assessment, diagnosis, safeguarding investigations or accreditation', 'Multiple campuses, additional staff cohorts or guaranteed attainment improvements'],
    revisionPolicy, timeline: 'Proposed 20–25 working days after inputs and staff responses are received.',
    addOns: [addOn('team-training', 1, 'Half-day workshop for up to 12 people on agreed research or evidence-use needs; venue and travel separate.')], pricingRationale,
  },
];

export type BundleQuoteLine = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: string;
  days: string;
  deliverables: string[];
  scope: string;
  kind: 'included' | 'add-on';
};
export type BundleQuote = {
  bundleId: string;
  title: string;
  audience: Audience;
  currency: 'GHS';
  status: typeof bundlePricingStatus;
  lines: BundleQuoteLine[];
  baseTotal: number;
  addOnTotal: number;
  total: number;
};

export function getBundle(id: string): ServiceBundle | undefined {
  return serviceBundles.find(bundle => bundle.id === id);
}

/** Rejects stale/forged package selections instead of silently under-quoting them. */
export function quoteBundle(bundleId: string, audience: Audience, addOns: Selection[] = []): BundleQuote {
  const bundle = getBundle(bundleId);
  if (!bundle) throw new Error('Choose an available package.');
  if (!bundle.audiences.includes(audience)) throw new Error('This package is not available for the selected client level.');
  if (!Array.isArray(addOns) || addOns.length > bundle.addOns.length) throw new Error('Choose only the listed package add-ons.');
  const seen = new Set<string>();
  const buildLine = (selection: Selection, kind: BundleQuoteLine['kind'], scope: string): BundleQuoteLine => {
    if (!Number.isSafeInteger(selection.quantity) || selection.quantity < 1) throw new Error('Quantities must be positive whole numbers.');
    const service = services.find(candidate => candidate.id === selection.id);
    if (!service || !service.audiences.includes(audience)) throw new Error('A selected service is not available for this client level.');
    const unitPrice = rate(service, audience);
    return {id: service.id, title: service.title, quantity: selection.quantity, unitPrice, total: unitPrice * selection.quantity, unit: service.unit, days: service.days, deliverables: service.deliverables, scope, kind};
  };
  const includedLines = bundle.items.map(selection => buildLine(selection, 'included', selection.scope));
  const extraLines = addOns.map(selection => {
    if (!selection || typeof selection.id !== 'string') throw new Error('Choose a valid package add-on.');
    const allowed = bundle.addOns.find(candidate => candidate.serviceId === selection.id);
    if (!allowed || bundle.items.some(included => included.id === selection.id) || seen.has(selection.id)) throw new Error('An add-on is unavailable or listed more than once.');
    seen.add(selection.id);
    if (selection.quantity > allowed.maxQuantity) throw new Error(`This add-on is limited to ${allowed.maxQuantity} units. Request a separate scope for more.`);
    return buildLine(selection, 'add-on', allowed.note);
  });
  const baseTotal = includedLines.reduce((sum, line) => sum + line.total, 0);
  const addOnTotal = extraLines.reduce((sum, line) => sum + line.total, 0);
  return {bundleId, title: bundle.title, audience, currency: 'GHS', status: bundlePricingStatus, lines: [...includedLines, ...extraLines], baseTotal, addOnTotal, total: baseTotal + addOnTotal};
}

export function bundleScopeSummary(bundleId: string, audience: Audience, addOns: Selection[] = []): string {
  const bundle = getBundle(bundleId);
  if (!bundle) throw new Error('Choose an available package.');
  const quote = quoteBundle(bundleId, audience, addOns);
  const clientLabel = audiences.find(client => client.id === audience)?.label ?? audience;
  return [
    `${bundle.title} — PACKAGE SCOPE`,
    `Client level: ${clientLabel}. Currency: GHS.`,
    ...quote.lines.map(line => `${line.kind === 'add-on' ? 'Add-on' : 'Included'}: ${line.title} × ${line.quantity} — GHS ${line.total}. ${line.scope}`),
    `Base: GHS ${quote.baseTotal}; add-ons: GHS ${quote.addOnTotal}; total: GHS ${quote.total}.`,
    `Delivery: ${bundle.timeline}`, `Revision limit: ${bundle.revisionPolicy}`,
    `Required inputs: ${bundle.prerequisites.join(' ')}`,
    `Excluded: ${bundle.exclusions.join(' ')}`,
    bundlePricingNotice, bundleAuthorshipNotice,
  ].join('\n');
}
