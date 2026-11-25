import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('ts-node').register({
  project: new URL('../tsconfig.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  transpileOnly: true,
});

const { resolveRedisConfig } = require('../src/core/redis/redis.service.ts');

test('resolveRedisConfig enables TLS and redacts password for rediss:// URLs', () => {
  const cfg = resolveRedisConfig(
    'rediss://default:super-secret-token@upstash.example.com:6379',
    'localhost',
    6379,
    undefined,
  );

  assert.equal(cfg.url, 'rediss://default:super-secret-token@upstash.example.com:6379');
  assert.deepEqual(cfg.options.tls, {});
  assert.equal(cfg.options.lazyConnect, true);
  assert.equal(cfg.displayTarget, 'rediss://upstash.example.com:6379');
  assert.ok(!cfg.displayTarget.includes('super-secret-token'));
});

test('resolveRedisConfig supports plain redis:// URLs without TLS', () => {
  const cfg = resolveRedisConfig('redis://cache.internal:6381', 'localhost', 6379, undefined);

  assert.equal(cfg.url, 'redis://cache.internal:6381');
  assert.equal(cfg.options.tls, undefined);
  assert.equal(cfg.displayTarget, 'redis://cache.internal:6381');
});

test('resolveRedisConfig defaults rediss:// log port to 6379 when omitted', () => {
  const cfg = resolveRedisConfig(
    'rediss://default:secret@upstash.example.com',
    'localhost',
    6379,
    undefined,
  );

  assert.deepEqual(cfg.options.tls, {});
  assert.equal(cfg.displayTarget, 'rediss://upstash.example.com:6379');
  assert.ok(!cfg.displayTarget.includes('secret'));
});

test('resolveRedisConfig falls back to host, port, and password when REDIS_URL is empty', () => {
  const cfg = resolveRedisConfig('   ', '127.0.0.1', 6380, 'localpass');

  assert.equal(cfg.url, undefined);
  assert.equal(cfg.options.host, '127.0.0.1');
  assert.equal(cfg.options.port, 6380);
  assert.equal(cfg.options.password, 'localpass');
  assert.equal(cfg.displayTarget, '127.0.0.1:6380');
});
