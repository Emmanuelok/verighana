import {audienceIds, audiences, type Audience, type Selection} from './catalog';
import {bundleAuthorshipNotice, bundlePricingNotice, getBundle, quoteBundle} from './service-bundles';
import type {BundleRequest} from './bundle-handoff';
import type {EstimateDocument} from './estimate-pdf';

const queryFields = ['bundleId', 'audience', 'addOns'];

/** Public catalogue choices only. Private brief fields are never accepted. */
export function parsePackagePdfConfig(params: URLSearchParams): BundleRequest {
  if (params.toString().length > 3000) throw new Error('Package configuration is too long.');
  for (const key of params.keys()) {
    if (!queryFields.includes(key) || params.getAll(key).length !== 1) throw new Error('Unsupported package configuration.');
  }
  const bundleId = params.get('bundleId') || '';
  const audience = params.get('audience');
  if (!audienceIds.includes(audience as Audience)) throw new Error('Choose an eligible client level.');
  const parsed: unknown = JSON.parse(params.get('addOns') || '[]');
  if (!Array.isArray(parsed)) throw new Error('Choose valid package add-ons.');
  const addOns: Selection[] = parsed.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        Object.keys(item).length !== 2 || !Object.hasOwn(item, 'id') || !Object.hasOwn(item, 'quantity') ||
        typeof item.id !== 'string' || !Number.isSafeInteger(item.quantity)) {
      throw new Error('Choose valid package add-ons.');
    }
    return {id: item.id, quantity: item.quantity};
  });
  const config = {bundleId, audience: audience as Audience, addOns};
  quoteBundle(config.bundleId, config.audience, config.addOns);
  return config;
}

export function packagePdfUrl(config: BundleRequest): string {
  quoteBundle(config.bundleId, config.audience, config.addOns);
  return '/api/package-pdf?' + new URLSearchParams({
    bundleId: config.bundleId, audience: config.audience,
    addOns: JSON.stringify(config.addOns.map(({id, quantity}) => ({id, quantity}))),
  }).toString();
}

/** All amounts and scope text come from the approved catalogue, never the request. */
export function packagePdfDocument(config: BundleRequest): EstimateDocument {
  const quote = quoteBundle(config.bundleId, config.audience, config.addOns);
  const bundle = getBundle(config.bundleId)!;
  return {
    pathway: audiences.find(item => item.id === config.audience)!.label,
    items: quote.lines.map(line => ({...line, deliverables: [line.scope, ...line.deliverables]})),
    packageProposal: {title: bundle.title, notes: [
      `Proposed timing: ${bundle.timeline}`, `Revisions: ${bundle.revisionPolicy}`,
      `Required inputs: ${bundle.prerequisites.join(' ')}`, `Excluded: ${bundle.exclusions.join(' ')}`,
      bundleAuthorshipNotice, bundlePricingNotice,
    ]},
  };
}
