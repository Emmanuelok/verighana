import { audienceIds, services, type Audience, type Selection } from './catalog';

export const MAX_ESTIMATE_ITEMS = 12;
export const MAX_ESTIMATE_QUANTITY = 500;

export function isEstimateQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_ESTIMATE_QUANTITY;
}

/** Recover valid rows without multiplying duplicated selections or accepting stale services. */
export function normalizeEstimate(input: unknown): { audience: Audience; items: Selection[]; repaired: boolean } | null {
  if (!input || typeof input !== 'object') return null;
  const saved = input as Record<string, unknown>;
  if (typeof saved.audience !== 'string' || !audienceIds.includes(saved.audience as Audience) || !Array.isArray(saved.items)) return null;
  const audience = saved.audience as Audience;
  const seen = new Set<string>();
  const items: Selection[] = [];
  for (const row of saved.items) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    if (typeof item.id !== 'string' || seen.has(item.id) || !isEstimateQuantity(item.quantity)) continue;
    if (!services.some(service => service.id === item.id && service.audiences.includes(audience))) continue;
    if (items.length >= MAX_ESTIMATE_ITEMS) break;
    seen.add(item.id);
    items.push({ id: item.id, quantity: item.quantity });
  }
  return { audience, items, repaired: items.length !== saved.items.length };
}

export function updateEstimateQuantity(items: Selection[], id: string, quantity: number): Selection[] {
  if (!isEstimateQuantity(quantity)) return items;
  return items.map(item => item.id === id ? { ...item, quantity } : item);
}
