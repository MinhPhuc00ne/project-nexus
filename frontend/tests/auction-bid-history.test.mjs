import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/components/auction/bidHistory.ts', import.meta.url),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { getLotBidHistory, mergeBidHistory } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

const bid = (id, lotId, amount = 10000, time = '2026-11-16T06:00:00Z') => ({
  id,
  auctionItemId: lotId,
  bidAmount: amount,
  status: 'ACCEPTED',
  placedAt: time,
  bidder: { id: 'buyer-1', fullName: 'Buyer' },
});

test('switching lots selects only that lot, including its older REST bids', () => {
  const older = bid('old-a', 'a');
  const recent = bid('recent-a', 'a', 12000, '2026-11-16T06:01:00Z');
  const other = bid('other-b', 'b');
  const auction = { bids: [other, recent] };
  assert.deepEqual(getLotBidHistory(auction, { id: 'a', bids: [older, recent] }), [recent, older]);
  assert.deepEqual(getLotBidHistory(auction, { id: 'b', bids: [other] }), [other]);
});

test('an empty lot never inherits another lot history or unassigned legacy bids', () => {
  const auction = { bids: [bid('other', 'b'), bid('legacy', null)] };
  assert.deepEqual(getLotBidHistory(auction, { id: 'a', bids: [] }), []);
});

test('the same REST and socket bid appears once, with updated bidder details', () => {
  const original = bid('same', 'a');
  const incoming = { ...original, bidder: { ...original.bidder, fullName: 'Updated' } };
  assert.deepEqual(mergeBidHistory([original], [incoming]), [incoming]);
});

test('equal amounts from the same buyer on different lots remain separate', () => {
  assert.equal(mergeBidHistory([bid('a1', 'a')], [bid('b1', 'b')]).length, 2);
});

test('new socket bids join only the matching lot and legacy sessions still work', () => {
  const incoming = bid('new', 'a');
  assert.deepEqual(getLotBidHistory({ bids: [incoming] }, { id: 'a' }), [incoming]);
  assert.deepEqual(getLotBidHistory({ bids: [incoming] }, { id: 'b' }), []);
  const legacy = bid('legacy', null);
  assert.deepEqual(getLotBidHistory({ bids: [legacy] }), [legacy]);
});
