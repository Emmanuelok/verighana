import {audienceIds, audiences, type Audience, type Selection} from './catalog';
import {bundleAuthorshipNotice, bundlePricingNotice, getBundle, quoteBundle} from './service-bundles';

export type BundleRequest = {bundleId: string; audience: Audience; addOns: Selection[]};

/** Carries catalogue choices only. Never place contact details or research text in a URL. */
export function bundleDeskUrl(request: BundleRequest): string {
  quoteBundle(request.bundleId, request.audience, request.addOns);
  return '/workspace?' + new URLSearchParams({bundle: request.bundleId, bundleAudience: request.audience,
    bundleAddons: JSON.stringify(request.addOns)}).toString();
}

export function parseBundleRequest(search: string): BundleRequest | null {
  const params = new URLSearchParams(search);
  if (!params.has('bundle')) return null;
  if (search.length > 3000) throw new Error('This bundle link is too long. Open the bundle catalogue and choose again.');
  try {
    const bundleId = params.get('bundle') || '';
    const audience = params.get('bundleAudience');
    if (!audienceIds.includes(audience as Audience)) throw new Error();
    const addOns: Selection[] = JSON.parse(params.get('bundleAddons') || '[]');
    quoteBundle(bundleId, audience as Audience, addOns);
    return {bundleId, audience: audience as Audience, addOns: addOns.map(({id, quantity}) => ({id, quantity}))};
  } catch { throw new Error('This bundle link has an unavailable package, pathway or add-on. Choose a current package from the bundle catalogue.'); }
}

export function bundleBriefDraft(request: BundleRequest) {
  const quote = quoteBundle(request.bundleId, request.audience, request.addOns);
  const bundle = getBundle(request.bundleId)!;
  const description = [bundle.title + ' — DRAFT PACKAGE',
    `Client level: ${audiences.find(item => item.id === request.audience)?.label}. See the itemised estimate for GHS prices.`,
    ...quote.lines.map(line => `${line.kind === 'add-on' ? 'Add-on' : 'Included'}: ${line.title} × ${line.quantity}. ${line.scope}`),
    `Delivery: ${bundle.timeline}`, `Revision limit: ${bundle.revisionPolicy}`,
    `Required inputs: ${bundle.prerequisites.join(' ')}`, `Excluded: ${bundle.exclusions.join(' ')}`,
    bundlePricingNotice, bundleAuthorshipNotice].join('\n');
  return {title: bundle.title, description,
    audience: request.audience, selections: quote.lines.map(({id, quantity}) => ({id, quantity})), total: quote.total};
}

export function matchesBundleScope(request: BundleRequest, audience: Audience, selections: Selection[]): boolean {
  try {
    const expected = bundleBriefDraft(request);
    return audience === request.audience && selections.length === expected.selections.length &&
      selections.every(item => expected.selections.some(line => line.id === item.id && line.quantity === item.quantity));
  } catch {return false;}
}
