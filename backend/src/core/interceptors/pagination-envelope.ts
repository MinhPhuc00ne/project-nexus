import type { PaginationMeta } from '@nexus/contracts';

/**
 * Normalises the four pagination shapes the API grew into one.
 *
 * Twenty-five services returned a paginated list in their own way:
 * `{ items, total, page, limit, totalPages }`, the same thing with the counters
 * nested under `pagination`, the same thing missing `totalPages`, and a bare
 * `{ items, total }`. A client had to know which endpoint it was talking to in
 * order to page through a list.
 *
 * Normalising here rather than in each service means the wire format has one
 * owner, every endpoint gains the `totalPages` it was missing, and a service
 * can keep returning whatever is natural until it is rewritten to produce
 * `PaginatedResponse` directly.
 */

/** A pagination envelope in its normalised form. */
export interface NormalisedPage {
  items: unknown[];
  meta: PaginationMeta;
}

interface CounterSource {
  total?: unknown;
  page?: unknown;
  limit?: unknown;
  totalPages?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a value as a non-negative integer, or returns undefined. */
function asCount(value: unknown): number | undefined {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.trunc(parsed);
}

/**
 * Builds the metadata for one page, filling in whatever the source omitted.
 *
 * `totalPages` is derived rather than trusted, so the four shapes cannot
 * disagree about it.
 */
function buildMeta(source: CounterSource, itemCount: number): PaginationMeta {
  const total = asCount(source.total) ?? itemCount;
  const limit = asCount(source.limit) ?? (itemCount > 0 ? itemCount : 20);
  const page = asCount(source.page) ?? 1;
  return {
    total,
    page: Math.max(1, page),
    limit: Math.max(1, limit),
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

/**
 * Converts a paginated payload into `{ items, meta }`, leaving anything else
 * untouched.
 *
 * @param payload - A handler's return value.
 * @returns The normalised page, or null when the payload is not a page.
 */
export function toPaginationEnvelope(payload: unknown): NormalisedPage | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.items)) return null;

  // Already normalised: leave it alone so a migrated service is not rewritten.
  if (isRecord(payload.meta) && 'totalPages' in payload.meta) return null;

  const nested = isRecord(payload.pagination) ? (payload.pagination as CounterSource) : undefined;
  const flat = payload as CounterSource;
  const hasCounters =
    nested !== undefined ||
    flat.total !== undefined ||
    flat.page !== undefined ||
    flat.limit !== undefined;

  // A payload that merely happens to carry an `items` array, with no counters
  // anywhere, is not a page and must not be reshaped.
  if (!hasCounters) return null;

  const meta = buildMeta(nested ?? flat, payload.items.length);

  // Everything that is not a counter is preserved: several endpoints return
  // extra fields alongside the page, such as aggregate summaries.
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (['items', 'total', 'page', 'limit', 'totalPages', 'pagination', 'meta'].includes(key)) {
      continue;
    }
    extras[key] = value;
  }

  return { ...extras, items: payload.items, meta };
}
