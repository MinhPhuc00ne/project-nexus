import { describe, expect, it } from 'vitest';
import { toPaginationEnvelope } from '../src/core/interceptors/pagination-envelope';

describe('pagination envelope normalisation', () => {
  it('keeps the full shape and derives totalPages rather than trusting it', () => {
    const page = toPaginationEnvelope({
      items: [1, 2, 3],
      total: 42,
      page: 2,
      limit: 20,
      // Deliberately wrong: a service that miscounts must not publish it.
      totalPages: 99,
    });

    expect(page).toEqual({
      items: [1, 2, 3],
      meta: { total: 42, page: 2, limit: 20, totalPages: 3 },
    });
  });

  it('lifts counters out of a nested pagination object', () => {
    const page = toPaginationEnvelope({
      items: ['a'],
      pagination: { total: 5, page: 1, limit: 2 },
    });

    expect(page).toEqual({ items: ['a'], meta: { total: 5, page: 1, limit: 2, totalPages: 3 } });
  });

  it('supplies the totalPages an endpoint omitted', () => {
    const page = toPaginationEnvelope({ items: [], total: 7, page: 3, limit: 3 });

    expect(page?.meta).toEqual({ total: 7, page: 3, limit: 3, totalPages: 3 });
  });

  it('fills in page and limit for a bare items and total payload', () => {
    const page = toPaginationEnvelope({ items: ['x', 'y'], total: 2 });

    expect(page?.meta).toEqual({ total: 2, page: 1, limit: 2, totalPages: 1 });
  });

  it('preserves fields returned alongside the page', () => {
    const page = toPaginationEnvelope({
      items: [1],
      total: 1,
      page: 1,
      limit: 10,
      summary: { pendingCount: 4 },
    });

    expect(page).toMatchObject({ summary: { pendingCount: 4 } });
    expect(page?.meta.totalPages).toBe(1);
  });

  it('coerces counters that arrive as strings', () => {
    const page = toPaginationEnvelope({ items: [], total: '30', page: '2', limit: '10' });

    expect(page?.meta).toEqual({ total: 30, page: 2, limit: 10, totalPages: 3 });
  });

  it('leaves an already normalised page untouched', () => {
    expect(
      toPaginationEnvelope({
        items: [1],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      }),
    ).toBeNull();
  });

  it('leaves a payload that merely carries an items array untouched', () => {
    // A media upload returns `{ urls, items }` with no counters; reshaping it
    // would invent pagination for something that is not a page.
    expect(toPaginationEnvelope({ urls: ['u'], items: [{ id: 'm1' }] })).toBeNull();
  });

  it('leaves non-paginated payloads untouched', () => {
    expect(toPaginationEnvelope(null)).toBeNull();
    expect(toPaginationEnvelope(undefined)).toBeNull();
    expect(toPaginationEnvelope([1, 2, 3])).toBeNull();
    expect(toPaginationEnvelope({ id: 'order-1' })).toBeNull();
    expect(toPaginationEnvelope('a string')).toBeNull();
  });

  it('never reports a page below 1 or a limit below 1', () => {
    const page = toPaginationEnvelope({ items: [], total: 0, page: 0, limit: 0 });

    expect(page?.meta.page).toBe(1);
    expect(page?.meta.limit).toBe(1);
    expect(page?.meta.totalPages).toBe(0);
  });
});
