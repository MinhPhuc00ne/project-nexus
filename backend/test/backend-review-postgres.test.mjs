import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { BannerService } = load('../src/modules/catalog/services/banner.service.ts');
const { SellerPickupService } = load(
  '../src/modules/fulfillment/services/seller-pickup.service.ts',
);
const { ShopShippingProfileService } = load(
  '../src/modules/users/services/shop-shipping-profile.service.ts',
);
const { AuctionImageService } = load('../src/modules/auction/services/auction-image.service.ts');

test(
  'backend review migrations and workflows preserve existing data in an isolated PostgreSQL schema',
  {
    skip: process.env.NEXUS_BACKEND_REVIEW_DB_TEST !== '1',
    timeout: 90000,
  },
  async (t) => {
    dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
    const url = new URL(process.env.DATABASE_URL);
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
    const schema = `review_test_${randomUUID().replaceAll('-', '')}`;
    assert.match(schema, /^review_test_[a-f0-9]{32}$/);
    const adminPool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 3000 });
    const sellerId = randomUUID(),
      legacyId = randomUUID(),
      sandboxId = randomUUID();
    let prisma,
      pool,
      schemaCreated = false;
    try {
      const client = await adminPool.connect();
      try {
        await client.query(`CREATE SCHEMA "${schema}"`);
        schemaCreated = true;
        await client.query(`SET search_path TO "${schema}"`);
        await client.query('BEGIN');
        const folder = new URL('../prisma/migrations/', import.meta.url);
        for (const entry of (await readdir(folder, { withFileTypes: true }))
          .filter((item) => item.isDirectory())
          .sort((a, b) => a.name.localeCompare(b.name))) {
          const sql = (
            await readFile(new URL(`${entry.name}/migration.sql`, folder), 'utf8')
          ).replace(/^\s*(?:BEGIN|COMMIT);[ \t]*$/gm, '');
          await client.query(sql);
        }

        // Seeded after the chain, because the squashed history has no
        // intermediate state to seed between.
        await client.query(
          'INSERT INTO users (id,email,password_hash,full_name,role,reputation_score,trust_level,updated_at) VALUES ($1,$2,$3,$4,$5,100,$6,NOW())',
          [sellerId, `${sellerId}@example.invalid`, 'fixture', 'Shop', 'SELLER', 'GOOD'],
        );
        for (const [id, environment] of [
          [legacyId, 'PRODUCTION'],
          [sandboxId, 'SANDBOX'],
        ]) {
          await client.query(
            `INSERT INTO seller_ghn_accounts (id,seller_id,environment,district_id,ward_code,status,ghn_shop_id,ghn_client_id,carrier_name,carrier_phone,carrier_address,verified_by,verified_at,updated_at)
            VALUES ($1,$2,$3,1,'01','VERIFIED',101,7,'Carrier shop','0901234567','12 Main, Ward, District, City',$2,NOW(),NOW())`,
            [id, sellerId, environment],
          );
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      pool = new Pool({
        connectionString: url.toString(),
        options: `-c search_path=${schema}`,
        max: 8,
      });
      prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
      const makeUser = (role) =>
        prisma.user.create({
          data: {
            email: `${randomUUID()}@example.invalid`,
            passwordHash: 'fixture',
            fullName: role,
            role,
          },
        });
      const [admin, staff, buyer] = await Promise.all([
        makeUser('ADMIN'),
        makeUser('SUPPORT_STAFF'),
        makeUser('BUYER'),
      ]);

      await t.test(
        'new accounts default to 50 PROBATION and carrier registrations keep their verified fields',
        async () => {
          assert.equal(buyer.reputationScore, 50);
          assert.equal(buyer.trustLevel, 'PROBATION');
          const existing = await prisma.user.findUniqueOrThrow({ where: { id: sellerId } });
          assert.equal(existing.reputationScore, 100);
          assert.equal(existing.trustLevel, 'GOOD');
          const raw = await pool.query(
            `INSERT INTO users (id,email,password_hash,full_name,updated_at) VALUES ($1,$2,'fixture','Raw default',NOW()) RETURNING reputation_score,trust_level`,
            [randomUUID(), `${randomUUID()}@example.invalid`],
          );
          assert.equal(raw.rows[0].reputation_score, 50);
          assert.equal(raw.rows[0].trust_level, 'PROBATION');
          const accounts = await prisma.sellerGhnAccount.findMany({ where: { sellerId } });
          assert.deepEqual(new Set(accounts.map((row) => row.id)), new Set([legacyId, sandboxId]));
          for (const row of accounts) {
            assert.equal(row.ghnShopId, 101);
            assert.equal(row.ghnClientId, 7);
            assert.equal(row.carrierAddress, '12 Main, Ward, District, City');
            assert.equal(row.profileFingerprint, null);
          }
          // The mid-history table name must not reappear in the schema.
          const table = await pool.query("SELECT to_regclass('seller_pickup_points') AS old_table");
          assert.equal(table.rows[0].old_table, null);
          await assert.rejects(
            prisma.sellerGhnAccount.create({
              data: {
                sellerId: buyer.id,
                environment: 'PRODUCTION',
                ghnShopId: 101,
                districtId: 1,
                wardCode: '01',
              },
            }),
            (error) => error.code === 'P2002',
          );
        },
      );

      await t.test(
        'a verified carrier registration is checked against the current profile and reused',
        async () => {
          await prisma.sellerUpgradeRequest.create({
            data: {
              userId: sellerId,
              storeName: 'Shop',
              phone: '0901234567',
              street: '12 Main',
              ward: 'Ward',
              district: 'District',
              city: 'City',
              status: 'APPROVED',
            },
          });
          let calls = 0;
          const shops = {
            ensure: async (input) => {
              calls++;
              return {
                id: 101,
                clientId: 7,
                name: 'Carrier shop',
                phone: input.phone,
                address: input.address,
                districtId: 1,
                wardCode: '01',
                active: true,
              };
            },
          };
          const service = new SellerPickupService(
            prisma,
            { get: () => undefined },
            { resolveDistrictAndWard: async () => ({ districtId: 1, wardCode: '01' }) },
            shops,
            new ShopShippingProfileService(prisma),
          );
          const point = await service.requireVerified(sellerId);
          assert.equal(point.id, legacyId);
          assert.equal(point.street, '12 Main');
          await service.requireVerified(sellerId);
          assert.equal(calls, 1);
          await prisma.$transaction((tx) => service.invalidate(tx, sellerId));
          assert.equal(
            await prisma.sellerGhnAccount.count({
              where: { sellerId, status: 'PENDING', profileFingerprint: null },
            }),
            2,
          );
          const pending = await service.pending();
          assert.equal(pending[0].street, '12 Main');
          shops.ensure = async () => {
            throw new Error('GHN unavailable');
          };
          await assert.rejects(service.requireVerified(sellerId), /GHN unavailable/);
          assert.equal(
            (await prisma.sellerGhnAccount.findUniqueOrThrow({ where: { id: legacyId } }))
              .ghnShopId,
            101,
          );
        },
      );

      await t.test(
        'banner reordering persists across reads, validates missing IDs and serializes concurrent requests',
        async () => {
          const service = new BannerService(prisma, {});
          const a = await service.save(admin.id, {
            title: 'Admin banner',
            imageUrl: 'https://example.invalid/a.png',
          });
          const b = await service.save(staff.id, {
            title: 'Staff banner',
            imageUrl: 'https://example.invalid/b.png',
          });
          const c = await service.save(admin.id, {
            title: 'Other banner',
            imageUrl: 'https://example.invalid/c.png',
          });
          await service.reorder(staff.id, [b.id, a.id]);
          assert.deepEqual(
            (await service.list(true)).map((row) => row.id),
            [b.id, a.id, c.id],
          );
          await assert.rejects(
            service.reorder(admin.id, [a.id, randomUUID()]),
            (error) => error.getStatus() === 404,
          );
          assert.deepEqual(
            (await service.list(false)).map((row) => row.id),
            [b.id, a.id, c.id],
          );
          await assert.rejects(
            service.reorder(buyer.id, [a.id]),
            (error) => error.getStatus() === 403,
          );
          await Promise.all([
            service.reorder(admin.id, [a.id, b.id]),
            service.reorder(staff.id, [b.id, a.id]),
          ]);
          const ids = (await service.list(true)).map((row) => row.id);
          assert.ok(
            JSON.stringify(ids) === JSON.stringify([a.id, b.id, c.id]) ||
              JSON.stringify(ids) === JSON.stringify([b.id, a.id, c.id]),
          );
          await Promise.all([
            service.reorder(admin.id, [a.id, b.id]),
            service.save(staff.id, { title: 'Updated staff banner', imageUrl: b.imageUrl }, b.id),
          ]);
          assert.equal((await service.list(true))[0].id, a.id);
        },
      );

      await t.test('staff can update only images of upcoming sessions', async () => {
        const auction = await prisma.auction.create({
          data: {
            title: 'Image fixture',
            startingPrice: 0,
            currentHighestBid: 0,
            startTime: new Date(Date.now() + 3600000),
            endTime: new Date(Date.now() + 7200000),
            originalEndTime: new Date(Date.now() + 7200000),
            status: 'SCHEDULED',
          },
        });
        const service = new AuctionImageService(prisma);
        const imageUrl = 'https://example.invalid/uploaded.png';
        assert.equal((await service.update(staff.id, auction.id, imageUrl)).imageUrl, imageUrl);
        await assert.rejects(
          service.update(buyer.id, auction.id, imageUrl),
          (error) => error.getStatus() === 403,
        );
        await assert.rejects(
          service.update(admin.id, randomUUID(), imageUrl),
          (error) => error.getStatus() === 404,
        );
        await prisma.auction.update({ where: { id: auction.id }, data: { status: 'ACTIVE' } });
        await assert.rejects(
          service.update(staff.id, auction.id, imageUrl),
          (error) => error.getStatus() === 400,
        );
        await prisma.auction.update({
          where: { id: auction.id },
          data: { status: 'SCHEDULED', startTime: new Date(Date.now() - 1000) },
        });
        await assert.rejects(
          service.update(admin.id, auction.id, imageUrl),
          (error) => error.getStatus() === 400,
        );
      });
    } finally {
      if (prisma) await prisma.$disconnect();
      if (pool) await pool.end();
      if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminPool.end();
    }
  },
);
