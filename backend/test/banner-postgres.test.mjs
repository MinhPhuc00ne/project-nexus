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
const source = (path) => load(`../src/modules/${path}.ts`);

test(
  'banner ordering, history and auction destinations use isolated PostgreSQL transactions',
  {
    skip: process.env.NEXUS_BANNER_DB_TEST !== '1',
    timeout: 90000,
  },
  async (t) => {
    dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
    const url = new URL(process.env.DATABASE_URL);
    assert.ok(
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
      'Local database required',
    );
    const schema = `banner_test_${randomUUID().replaceAll('-', '')}`;
    assert.match(schema, /^banner_test_[a-f0-9]{32}$/);
    const adminPool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 3000 });
    let prisma;
    let pool;
    try {
      const client = await adminPool.connect();
      try {
        await client.query(`CREATE SCHEMA "${schema}"`);
        await client.query(`SET search_path TO "${schema}"`);
        await client.query('BEGIN');
        const folder = new URL('../prisma/migrations/', import.meta.url);
        for (const entry of (await readdir(folder, { withFileTypes: true }))
          .filter((item) => item.isDirectory())
          .sort((a, b) => a.name.localeCompare(b.name))) {
          const sql = (
            await readFile(new URL(`${entry.name}/migration.sql`, folder), 'utf8')
          ).replace(/^\s*(?:BEGIN|COMMIT);[ \t]*$/gm, '');
          if (entry.name === '20261109120000_banner_ordering_and_history') {
            const adminId = randomUUID(),
              staffId = randomUUID();
            for (const [id, role] of [
              [adminId, 'ADMIN'],
              [staffId, 'SUPPORT_STAFF'],
            ]) {
              await client.query(
                'INSERT INTO users (id,email,password_hash,full_name,role,updated_at) VALUES ($1,$2,$3,$4,$5,NOW())',
                [id, `${id}@example.invalid`, 'test-only', 'Migration fixture', role],
              );
              await client.query(
                "INSERT INTO event_banners (id,title,image_url,creator_id,created_at,updated_at) VALUES ($1,$2,$3,$4,'2025-01-01',NOW())",
                [
                  randomUUID(),
                  'Before migration ' + (role === 'ADMIN' ? 'admin' : 'staff'),
                  'https://example.invalid/x.png',
                  id,
                ],
              );
            }
          }
          await client.query(sql);
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
      const { BannerService } = source('catalog/services/banner.service');
      const { BannerHistoryService } = source('catalog/services/banner-history.service');
      const { NotificationsService } = source('notifications/services/notifications.service');
      const { AuctionService } = source('auction/services/auction.service');
      const history = new BannerHistoryService(prisma);
      const banners = new BannerService(prisma, history);
      const notifications = new NotificationsService(prisma);
      const user = (role, fullName) =>
        prisma.user.create({
          data: {
            email: `${randomUUID()}@example.invalid`,
            passwordHash: 'test-only',
            fullName,
            role,
          },
        });
      const [admin, secondAdmin, staff, otherStaff, buyer] = await Promise.all([
        user('ADMIN', 'Admin creator'),
        user('ADMIN', 'Other admin'),
        user('SUPPORT_STAFF', 'Staff operator'),
        user('SUPPORT_STAFF', 'Other staff'),
        user('BUYER', 'Buyer'),
      ]);
      const body = (title, extra = {}) => ({
        title,
        imageUrl: 'https://example.invalid/banner.png',
        ...extra,
      });
      const make = (actor, title, extra) => banners.save(actor.id, body(title, extra));
      const query = (extra = {}) => ({ page: 1, limit: 100, ...extra });
      let adminOld, adminNew, staffOld, staffNew;

      await t.test(
        'migration backfills existing creator groups without manufacturing historical actions',
        async () => {
          const rows = await prisma.eventBanner.findMany({
            where: { title: { startsWith: 'Before migration' } },
          });
          assert.equal(rows.length, 2);
          assert.equal(rows.find((row) => row.title.endsWith('admin')).creatorRole, 'ADMIN');
          assert.equal(rows.find((row) => row.title.endsWith('staff')).creatorRole, 'STAFF');
          assert.equal(await prisma.bannerDisableHistory.count(), 0);
        },
      );

      await t.test(
        'admin banners precede even newer staff banners, with newest first inside each group',
        async () => {
          adminOld = await make(admin, 'Admin old', { priority: 0 });
          adminNew = await make(admin, 'Admin new', { priority: 0 });
          staffOld = await make(staff, 'Staff old', { priority: 0 });
          staffNew = await make(staff, 'Staff new', { priority: 0 });
          const fixture = [
            [adminOld, '2026-01-01'],
            [adminNew, '2026-01-02'],
            [staffOld, '2026-01-03'],
            [staffNew, '2026-01-04'],
          ];
          for (const [row, date] of fixture)
            await prisma.eventBanner.update({
              where: { id: row.id },
              data: { createdAt: new Date(date) },
            });
          const ids = new Set(fixture.map(([row]) => row.id));
          for (const publicOnly of [true, false]) {
            const rows = (await banners.list(publicOnly)).filter((row) => ids.has(row.id));
            assert.deepEqual(
              rows.map((row) => row.id),
              [adminNew.id, adminOld.id, staffNew.id, staffOld.id],
            );
            if (publicOnly) assert.equal(rows[0].creatorId, undefined);
          }
          await prisma.user.update({ where: { id: staff.id }, data: { role: 'ADMIN' } });
          await banners.save(staff.id, body('Edited staff banner'), staffNew.id);
          assert.equal(
            (await prisma.eventBanner.findUniqueOrThrow({ where: { id: staffNew.id } }))
              .creatorRole,
            'STAFF',
          );
          assert.equal(
            (
              await prisma.eventBanner.findUniqueOrThrow({ where: { id: staffNew.id } })
            ).createdAt.toISOString(),
            new Date('2026-01-04').toISOString(),
          );
          await prisma.user.update({ where: { id: staff.id }, data: { role: 'SUPPORT_STAFF' } });
        },
      );

      await t.test(
        'concurrent staff deletion of an admin banner immediately writes one audit action and one notification per admin',
        async () => {
          const noticesBefore = await prisma.notification.count();
          const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
          await Promise.all([
            banners.remove(adminOld.id, staff.id),
            banners.remove(adminOld.id, otherStaff.id),
          ]);
          const row = await prisma.eventBanner.findUniqueOrThrow({ where: { id: adminOld.id } });
          assert.equal(row.isActive, false);
          const records = await prisma.bannerDisableHistory.findMany({
            where: { bannerId: row.id },
          });
          assert.equal(records.length, 1);
          assert.ok([staff.id, otherStaff.id].includes(records[0].actorId));
          assert.equal(records[0].creatorId, admin.id);
          assert.equal(records[0].creatorRole, 'ADMIN');
          assert.equal(records[0].actorRole, 'SUPPORT_STAFF');
          assert.equal(records[0].wasActive, true);
          assert.equal(records[0].isActive, false);
          assert.equal(records[0].source, 'DELETE');
          assert.equal(await prisma.notification.count(), noticesBefore + adminCount);
          await banners.remove(row.id, staff.id);
          assert.equal(await prisma.notification.count(), noticesBefore + adminCount);
          for (const account of [admin, secondAdmin]) {
            const notice = await prisma.notification.findFirstOrThrow({
              where: { userId: account.id },
            });
            assert.ok(notice.content.includes(records[0].actorId));
            assert.ok(notice.content.includes(records[0].id));
            assert.equal(notice.targetUrl, '/admin/banners');
          }
        },
      );

      await t.test(
        'staff can disable own and other staff banners through update and disable routes, with immutable snapshots',
        async () => {
          await banners.save(
            staff.id,
            body('Renamed while disabling', { isActive: false }),
            staffOld.id,
          );
          await banners.remove(staffNew.id, otherStaff.id, 'DISABLE');
          const own = await history.list(query({ bannerId: staffOld.id, actorId: staff.id }));
          assert.equal(own.total, 1);
          assert.equal(own.items[0].source, 'UPDATE');
          assert.equal(own.items[0].bannerTitle, 'Staff old');
          assert.equal(own.items[0].creatorId, staff.id);
          assert.equal(own.items[0].actorName, staff.fullName);
          await prisma.user.update({
            where: { id: staff.id },
            data: { fullName: 'Changed later' },
          });
          assert.equal(
            (await history.list(query({ bannerId: staffOld.id }))).items[0].actorName,
            staff.fullName,
          );
          assert.equal(
            (await history.list(query({ actorId: otherStaff.id }))).items.some(
              (row) => row.bannerId === staffNew.id,
            ),
            true,
          );
          const from = new Date(Date.now() - 60000).toISOString();
          assert.ok(
            (await history.list(query({ from, to: new Date(Date.now() + 60000).toISOString() })))
              .total >= 3,
          );
          await assert.rejects(
            history.list(query({ from: '2026-02-01', to: '2026-01-01' })),
            (error) => error.getStatus() === 400,
          );
          const first = await history.list({ page: 1, limit: 1 });
          const second = await history.list({ page: 2, limit: 1 });
          assert.notEqual(first.items[0].id, second.items[0].id);
          await banners.save(staff.id, body('Reactivated', { isActive: true }), staffOld.id);
          await banners.remove(staffOld.id, staff.id);
          assert.equal((await history.list(query({ bannerId: staffOld.id }))).total, 2);
        },
      );

      await t.test(
        'admin deactivation is audited without notifying admins, and ordinary users cannot write banners',
        async () => {
          const count = await prisma.notification.count();
          await banners.remove(adminNew.id, admin.id);
          assert.equal(
            (await history.list(query({ bannerId: adminNew.id }))).items[0].actorRole,
            'ADMIN',
          );
          assert.equal(await prisma.notification.count(), count);
          await assert.rejects(make(buyer, 'Forbidden'), (error) => error.getStatus() === 403);
          await assert.rejects(
            banners.remove(randomUUID(), staff.id),
            (error) => error.getStatus() === 404,
          );
        },
      );

      await t.test(
        'history and notification failure roll back banner deactivation together',
        async () => {
          const banner = await make(staff, 'Rollback fixture');
          const noticesBefore = await prisma.notification.count();
          const failing = new BannerService(prisma, {
            record: async (tx, input) => {
              await history.record(tx, input);
              throw new Error('Fixture storage failure');
            },
          });
          await assert.rejects(failing.remove(banner.id, staff.id), /Fixture storage failure/);
          assert.equal(
            (await prisma.eventBanner.findUniqueOrThrow({ where: { id: banner.id } })).isActive,
            true,
          );
          assert.equal((await history.list(query({ bannerId: banner.id }))).total, 0);
          assert.equal(await prisma.notification.count(), noticesBefore);
        },
      );

      await t.test(
        'database ordering occurs before the hundred-banner limit and publication filtering remains intact',
        async () => {
          const creator = {
            creatorId: staff.id,
            creatorRole: 'STAFF',
            imageUrl: 'https://example.invalid/x.png',
          };
          await prisma.eventBanner.createMany({
            data: Array.from({ length: 105 }, (_, index) => ({
              ...creator,
              title: `Large staff fixture ${index}`,
              priority: 0,
            })),
          });
          const adminBanner = await make(admin, 'Admin outranks the entire staff limit');
          const expired = await make(admin, 'Expired', { endsAt: '2000-01-01T00:00:00Z' });
          const upcoming = await make(admin, 'Upcoming', { startsAt: '2099-01-01T00:00:00Z' });
          const rows = await banners.list(true);
          assert.equal(rows.length, 100);
          assert.equal(rows[0].id, adminBanner.id);
          assert.equal(
            rows.some((row) => [expired.id, upcoming.id].includes(row.id)),
            false,
          );
        },
      );

      await t.test(
        'banner, auction notification and manual auction browsing return the same canonical destination',
        async () => {
          const auction = await prisma.auction.create({
            data: {
              title: 'Navigation fixture',
              startingPrice: 0,
              currentHighestBid: 0,
              startTime: new Date(),
              endTime: new Date(Date.now() + 7200000),
              originalEndTime: new Date(Date.now() + 7200000),
              status: 'SCHEDULED',
            },
          });
          const banner = await make(admin, 'Auction linked banner', {
            auctionId: auction.id,
            targetUrl: 'https://example.invalid/ignored',
          });
          assert.equal(banner.targetUrl, `/auction/${auction.id}`);
          await notifications.createNotification({
            userId: buyer.id,
            title: 'Auction fixture',
            content: 'Open the auction',
            type: 'AUCTION',
            auctionId: auction.id,
          });
          const inbox = await notifications.getUserNotifications(buyer.id, { page: 1, limit: 10 });
          const auctions = new AuctionService(prisma, {}, {}, {});
          const listing = await auctions.getAuctions({ page: 1, limit: 20 });
          assert.equal(
            listing.items.find((row) => row.id === auction.id).targetUrl,
            banner.targetUrl,
          );
          assert.equal((await auctions.getAuctionDetail(auction.id)).targetUrl, banner.targetUrl);
          assert.equal(inbox.items[0].auctionId, auction.id);
          assert.equal(inbox.items[0].targetUrl, banner.targetUrl);
          await prisma.auction.update({ where: { id: auction.id }, data: { status: 'CANCELLED' } });
          await banners.save(
            staff.id,
            body('Hide cancelled auction banner', { isActive: false }),
            banner.id,
          );
          assert.equal((await history.list(query({ bannerId: banner.id }))).total, 1);
          assert.equal(
            (await notifications.getUserNotifications(otherStaff.id, { page: 1, limit: 10 })).items
              .length,
            0,
          );
          await assert.rejects(
            make(admin, 'Missing auction', { auctionId: randomUUID() }),
            (error) => error.getStatus() === 404,
          );
        },
      );
    } finally {
      if (prisma) await prisma.$disconnect();
      if (pool) await pool.end();
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminPool.end();
    }
  },
);
