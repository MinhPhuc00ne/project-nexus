import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { unwrapAuctionResponse } = await loadModule('../src/services/auction-response.helpers.ts');
const { resolveNotificationTargetUrl } = await loadModule('../src/utils/notificationNavigation.ts');

test('wrapped buyer awards keep the second-chance invitation visible', () => {
  const awards = [{ id: 'offer', tier: 'SECOND_CHANCE', status: 'AWAITING_ACCEPTANCE' }];
  assert.deepEqual(unwrapAuctionResponse({ statusCode: 200, data: awards }), awards);
  assert.deepEqual(unwrapAuctionResponse(awards), awards);
});

test('respond, quote, and checkout payloads expose their actual result fields', () => {
  for (const result of [
    { status: 'AWAITING_DEPOSIT' },
    { status: 'AWAITING_CHECKOUT' },
    { status: 'DECLINED' },
    { remainingProductAmount: 70000, shippingFee: 15000 },
    { order: { id: 'order' } },
  ]) {
    assert.deepEqual(unwrapAuctionResponse({ statusCode: 200, data: result }), result);
  }
});

test('existing invitation links open the profile purchase tab', () => {
  const target = resolveNotificationTargetUrl({
    type: 'AUCTION',
    auctionId: 'auction',
    targetUrl: '/auction/auction',
    metadata: { actionType: 'SECOND_CHANCE_INVITATION' },
  });
  assert.equal(target, '/buyer/profile?tab=auction-offers');
});

test('older invitations without metadata also open the purchase tab', () => {
  assert.equal(
    resolveNotificationTargetUrl({
      type: 'AUCTION',
      title: 'Cơ hội mua Đồng hồ theo mức giá bạn đã đặt',
      targetUrl: '/auction/auction',
    }),
    '/buyer/profile?tab=auction-offers',
  );
});

test('unrelated buyer and seller notifications keep their original destination', () => {
  for (const actionType of [
    'AUCTION_OUTBID',
    'SECOND_CHANCE_SENT',
    'SECOND_CHANCE_WITHDRAWN_SELLER',
  ]) {
    assert.equal(
      resolveNotificationTargetUrl({
        targetUrl: '/auction/auction',
        metadata: { actionType },
      }),
      '/auction/auction',
    );
  }
});
