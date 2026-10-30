import { audienceIds, services, type Audience, type Selection } from './catalog';

const TRANSFER_KEY = 'vrg-estimate';

export function parseEstimateTransfer(hash: string): { audience: Audience; items: Selection[] } | null {
  if (hash.length > 6000) return null;
  const value = new URLSearchParams(hash.replace(/^#/, '')).get(TRANSFER_KEY);
  if (!value) return null;
  try {
    const input = JSON.parse(value);
    if (!input || !audienceIds.includes(input.audience) || !Array.isArray(input.items) || input.items.length > 12) return null;
    const seen = new Set<string>();
    for (const item of input.items) {
      if (!item || typeof item.id !== 'string' || seen.has(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 500) return null;
      if (!services.some(service => service.id === item.id && service.audiences.includes(input.audience))) return null;
      seen.add(item.id);
    }
    return { audience: input.audience, items: input.items.map((item: Selection) => ({ id: item.id, quantity: item.quantity })) };
  } catch {
    return null;
  }
}

export function researchDeskUrl(audience: Audience, items: Selection[]): string {
  const url = new URL('https://fvsignature.com/workspace');
  // Only catalogue selections are transferred. No identity, credentials or brief text.
  if (items.length > 0) url.hash = new URLSearchParams({ [TRANSFER_KEY]: JSON.stringify({ audience, items }) }).toString();
  return url.toString();
}
