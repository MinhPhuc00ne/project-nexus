const STORAGE_PREFIX = 'nexus:buyer-product-interest:';
const MAX_STORED_VIEWS = 100;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface ProductInterest {
  productId: string;
  categoryId: string;
  viewedAt: number;
  source?: 'VIEW' | 'PURCHASE';
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function readProductInterests(userId: string): ProductInterest[] {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Stored buyer product interests are invalid.');
  }
  return parsed.filter(
    (item): item is ProductInterest =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.productId === 'string' &&
      typeof item.categoryId === 'string' &&
      typeof item.viewedAt === 'number' &&
      (item.source === undefined || item.source === 'VIEW' || item.source === 'PURCHASE'),
  );
}

export function recordBuyerProductView(
  userId: string,
  product: { id: string; categoryId?: string | null },
  now = Date.now(),
): void {
  if (!userId || !product.id || !product.categoryId) return;
  const recent = readProductInterests(userId).filter(
    (view) => now - view.viewedAt < MAX_AGE_MS && view.viewedAt <= now,
  );
  const next = [
    {
      productId: product.id,
      categoryId: product.categoryId,
      viewedAt: now,
      source: 'VIEW' as const,
    },
    ...recent.filter((view) => view.productId !== product.id),
  ].slice(0, MAX_STORED_VIEWS);
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
}

export function recordBuyerProductPurchase(
  userId: string,
  product: { id: string; categoryId?: string | null },
  purchasedAt = Date.now(),
): void {
  if (!userId || !product.id || !product.categoryId) return;
  const recent = readProductInterests(userId).filter(
    (interest) => purchasedAt - interest.viewedAt < MAX_AGE_MS && interest.viewedAt <= purchasedAt,
  );
  const existing = recent.find((interest) => interest.productId === product.id);
  const next = [
    {
      productId: product.id,
      categoryId: product.categoryId,
      viewedAt: Math.max(existing?.viewedAt ?? 0, purchasedAt),
      source: 'PURCHASE' as const,
    },
    ...recent.filter((interest) => interest.productId !== product.id),
  ].slice(0, MAX_STORED_VIEWS);
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
}

export function getBuyerInterestCategoryIds(userId: string, now = Date.now()): string[] {
  const counts = new Map<string, { count: number; lastViewedAt: number }>();
  for (const interest of readProductInterests(userId)) {
    if (now - interest.viewedAt >= MAX_AGE_MS || interest.viewedAt > now) continue;
    const current = counts.get(interest.categoryId);
    counts.set(interest.categoryId, {
      count: (current?.count ?? 0) + (interest.source === 'PURCHASE' ? 3 : 1),
      lastViewedAt: Math.max(current?.lastViewedAt ?? 0, interest.viewedAt),
    });
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.lastViewedAt - a.lastViewedAt)
    .map(([categoryId]) => categoryId);
}
