import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function sellerService(token, http) {
  const requests = [];
  const source = readFileSync(new URL('../src/services/seller.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  const context = vm.createContext({
    AbortSignal,
    fetch: async (url, options) => {
      requests.push({ url, ...options });
      return http();
    },
  });
  vm.runInContext(`(function(exports, require) { ${code}\n})`, context)(exports, (name) => {
    if (name === './auth') return { getStoredToken: () => token };
    if (name === './api') return { API_BASE_URL: 'http://test/api/v1' };
    throw new Error(`Unexpected import: ${name}`);
  });
  return { ...exports, requests };
}

test('seller access requires a token before requesting profile data', async () => {
  const service = sellerService(null, () => {
    throw new Error('Should not fetch');
  });
  await assert.rejects(service.getSellerSession(), (error) => error.status === 401);
  assert.equal(service.requests.length, 0);
});

test('seller session uses the authenticated backend profile', async () => {
  const profile = { id: 'seller-1', role: 'SELLER', fullName: 'Seller', wallet: { balance: 100 } };
  const service = sellerService('access-token', () => Response.json({ data: profile }));
  const actual = await service.getSellerSession();
  assert.equal(actual.id, profile.id);
  assert.equal(actual.wallet.balance, 100);
  assert.equal(service.requests[0].url, 'http://test/api/v1/users/me');
  assert.equal(service.requests[0].headers.Authorization, 'Bearer access-token');
});

test('buyer, staff and admin profiles cannot enter the seller area', async () => {
  for (const role of ['BUYER', 'SUPPORT_STAFF', 'ADMIN', 'GUEST']) {
    const service = sellerService('token', () => Response.json({ data: { id: 'user', role } }));
    await assert.rejects(service.getSellerSession(), (error) => error.status === 403, role);
  }
});

test('an expired seller session is distinguished from a temporary server failure', async () => {
  for (const status of [401, 500]) {
    const service = sellerService('token', () => Response.json({}, { status }));
    await assert.rejects(service.getSellerSession(), (error) => error.status === status);
  }
});

test('network failure and malformed profile data do not grant seller access', async () => {
  const offline = sellerService('token', () => {
    throw new Error('offline');
  });
  await assert.rejects(offline.getSellerSession());
  const malformed = sellerService('token', () => Response.json({ data: { role: 'SELLER' } }));
  await assert.rejects(malformed.getSellerSession());
});
