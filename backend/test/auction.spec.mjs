import test from './helpers/vitest-node-compat.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import tsNode from 'ts-node';
import { ForbiddenException, BadRequestException, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { AuctionService } = load('../src/modules/auction/services/auction.service.ts');
const { AuctionComplaintService } = load(
  '../src/modules/auction/services/auction-complaint.service.ts',
);
const { AuctionGateway } = load('../src/modules/auction/gateways/auction.gateway.ts');
const { AuctionController } = load('../src/modules/auction/controllers/auction.controller.ts');
const { AuctionCheckoutService } = load(
  '../src/modules/auction/services/auction-checkout.service.ts',
);
const { OrderService } = load('../src/modules/orders/services/order.service.ts');
const { TokenAuthService } = load('../src/core/security/token-auth.service.ts');
const { PrismaService } = load('../src/core/prisma/prisma.service.ts');
const { ConfigService } = load('@nestjs/config');
const { WS_AUCTION_EVENTS } = load('@nexus/contracts');
const { AuctionAdminHelper } = load('../src/modules/auction/services/auction-admin.helper.ts');
const { AuctionBiddingHelper } = load('../src/modules/auction/services/auction-bidding.helper.ts');
const { AuctionConsignmentHelper } = load(
  '../src/modules/auction/services/auction-consignment.helper.ts',
);
const { AuctionSecondChanceHelper } = load(
  '../src/modules/auction/services/auction-second-chance.helper.ts',
);
const { OrderPaymentHelper } = load('../src/modules/orders/services/order-payment.helper.ts');
const { WalletDepositService } = load('../src/modules/wallet/services/wallet-deposit.service.ts');

function createHarness(overrides = {}) {
  const wallets = new Map([
    ['buyer-1', { id: 'wallet-b1', userId: 'buyer-1', balance: 20_000_000, lockedBalance: 0 }],
    ['buyer-2', { id: 'wallet-b2', userId: 'buyer-2', balance: 20_000_000, lockedBalance: 0 }],
    ['buyer-3', { id: 'wallet-b3', userId: 'buyer-3', balance: 20_000_000, lockedBalance: 0 }],
    ['seller-1', { id: 'wallet-s1', userId: 'seller-1', balance: 1_000_000, lockedBalance: 0 }],
    ['admin-1', { id: 'wallet-adm', userId: 'admin-1', balance: 0, lockedBalance: 0 }],
  ]);

  const users = new Map([
    [
      'admin-1',
      {
        id: 'admin-1',
        role: 'ADMIN',
        fullName: 'System Admin',
        email: 'admin@nexus.local',
        isSellerActive: false,
        isShopSuspended: false,
        reputationScore: 100,
        trustLevel: 'GOOD',
      },
    ],
    [
      'staff-1',
      {
        id: 'staff-1',
        role: 'SUPPORT_STAFF',
        fullName: 'Support Staff',
        email: 'staff@nexus.local',
        isSellerActive: false,
        isShopSuspended: false,
        reputationScore: 100,
        trustLevel: 'GOOD',
      },
    ],
    [
      'seller-1',
      {
        id: 'seller-1',
        role: 'SELLER',
        fullName: 'Luxury Timepieces',
        email: 'seller1@nexus.local',
        isSellerActive: true,
        isShopSuspended: false,
        reputationScore: 100,
        trustLevel: 'GOOD',
      },
    ],
    [
      'buyer-1',
      {
        id: 'buyer-1',
        role: 'BUYER',
        fullName: 'Buyer One',
        email: 'buyer1@nexus.local',
        isSellerActive: false,
        isShopSuspended: false,
        reputationScore: 100,
        trustLevel: 'GOOD',
      },
    ],
    [
      'buyer-2',
      {
        id: 'buyer-2',
        role: 'BUYER',
        fullName: 'Buyer Two',
        email: 'buyer2@nexus.local',
        isSellerActive: false,
        isShopSuspended: false,
        reputationScore: 100,
        trustLevel: 'GOOD',
      },
    ],
    [
      'buyer-3',
      {
        id: 'buyer-3',
        role: 'BUYER',
        fullName: 'Buyer Three',
        email: 'buyer3@nexus.local',
        isSellerActive: false,
        isShopSuspended: false,
        reputationScore: 100,
        trustLevel: 'GOOD',
      },
    ],
  ]);

  const auctions = new Map();
  const auctionItems = new Map();
  const bids = [];
  const awards = new Map();
  const orders = new Map();
  const payments = [];
  const notifications = [];
  const walletTransactions = [];
  const complaints = new Map();
  const reputationCalls = [];
  const broadcasts = {
    started: [],
    bids: [],
    extended: [],
    lotEnded: [],
    ended: [],
  };

  let idSeq = 1;
  const nextId = (prefix) => `${prefix}-${idSeq++}`;

  const gateway = {
    registerPlaceBidHandler() {},
    broadcastAuctionStarted(payload) {
      broadcasts.started.push(payload);
    },
    broadcastBidPlaced(payload) {
      broadcasts.bids.push(payload);
    },
    broadcastTimerSync() {},
    broadcastTimeExtended(payload) {
      broadcasts.extended.push(payload);
    },
    broadcastLotEnded(payload) {
      broadcasts.lotEnded.push(payload);
    },
    broadcastAuctionEnded(payload) {
      broadcasts.ended.push(payload);
    },
  };

  function resolveWallet(where) {
    if (where.id) {
      for (const w of wallets.values()) {
        if (w.id === where.id) return w;
      }
      return null;
    }
    return wallets.get(where.userId) ?? null;
  }

  function applyNumericOps(target, data) {
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && 'increment' in val) {
        target[key] = Number(target[key] ?? 0) + Number(val.increment);
      } else if (val && typeof val === 'object' && 'decrement' in val) {
        target[key] = Number(target[key] ?? 0) - Number(val.decrement);
      } else if (val !== undefined) {
        target[key] = val;
      }
    }
  }

  function attachAwardRelations(award) {
    const auction = auctions.get(award.auctionId) ?? null;
    const auctionItem = award.auctionItemId
      ? (auctionItems.get(award.auctionItemId) ?? null)
      : null;
    const bid = bids.find((b) => b.id === award.bidId) ?? null;
    const order = award.orderId ? (orders.get(award.orderId) ?? null) : null;
    const buyer = award.buyerId ? (users.get(award.buyerId) ?? null) : null;
    return { ...award, auction, auctionItem, bid, order, buyer };
  }

  const db = {
    $queryRaw: async () => [],
    $transaction: async (cb) => cb(db),
    user: {
      findUnique: async ({ where }) => users.get(where.id) ?? null,
      findMany: async ({ where } = {}) => {
        return [...users.values()].filter((u) => {
          if (!where) return true;
          if (where.id?.not && u.id === where.id.not) return false;
          if (where.role && u.role !== where.role) return false;
          if (where.isShopSuspended !== undefined && u.isShopSuspended !== where.isShopSuspended) {
            return false;
          }
          if (
            where.reputationScore?.gte !== undefined &&
            u.reputationScore < where.reputationScore.gte
          ) {
            return false;
          }
          return true;
        });
      },
    },
    wallet: {
      findUnique: async ({ where }) => resolveWallet(where),
      findUniqueOrThrow: async ({ where }) => {
        const w = resolveWallet(where);
        if (!w) throw new Error('Wallet not found');
        return { ...w };
      },
      create: async ({ data }) => {
        const w = { id: nextId('wallet'), ...data };
        wallets.set(w.userId, w);
        return w;
      },
      update: async ({ where, data }) => {
        const w = resolveWallet(where);
        applyNumericOps(w, data);
        return { ...w };
      },
    },
    walletTransaction: {
      create: async ({ data }) => {
        const txRow = { id: nextId('wtx'), createdAt: new Date(), ...data };
        walletTransactions.push(txRow);
        return txRow;
      },
    },
    auction: {
      create: async ({ data }) => {
        const now = new Date();
        const row = {
          id: nextId('auc'),
          createdAt: now,
          updatedAt: now,
          currentHighestBid: 0,
          currentHighestBidderId: null,
          totalBidsCount: 0,
          isExtended: false,
          isConsignmentLocked: false,
          consignmentLockedAt: null,
          productId: null,
          sellerId: null,
          ...data,
        };
        auctions.set(row.id, row);
        return row;
      },
      findUnique: async ({ where, include }) => {
        const row = auctions.get(where.id);
        if (!row) return null;
        if (!include) return { ...row };
        const items = [...auctionItems.values()]
          .filter((item) => {
            if (item.auctionId !== row.id) return false;
            if (include.items?.where?.status && item.status !== include.items.where.status) {
              return false;
            }
            return true;
          })
          .map((item) => ({
            ...item,
            seller: users.get(item.sellerId) ?? null,
            bids: bids.filter((b) => b.auctionItemId === item.id),
            awards: [...awards.values()].filter((a) => a.auctionItemId === item.id),
          }));
        return {
          ...row,
          items,
          bids: bids.filter((b) => b.auctionId === row.id),
        };
      },
      count: async () => auctions.size,
      findMany: async ({ include } = {}) =>
        [...auctions.values()].map((row) => {
          if (!include) return { ...row };
          const items = [...auctionItems.values()].filter((item) => {
            if (item.auctionId !== row.id) return false;
            if (include.items?.where?.status && item.status !== include.items.where.status) {
              return false;
            }
            return true;
          });
          return {
            ...row,
            createdByAdmin: row.createdByAdminId ? (users.get(row.createdByAdminId) ?? null) : null,
            seller: row.sellerId ? (users.get(row.sellerId) ?? null) : null,
            product: row.product ?? null,
            items,
            _count: {
              bids: bids.filter((b) => b.auctionId === row.id).length,
              items: [...auctionItems.values()].filter((item) => item.auctionId === row.id).length,
            },
          };
        }),
      update: async ({ where, data }) => {
        const row = auctions.get(where.id);
        applyNumericOps(row, data);
        return { ...row };
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const a of auctions.values()) {
          if (a.id === where.id) {
            applyNumericOps(a, data);
            count++;
          }
        }
        return { count };
      },
    },
    auctionItem: {
      create: async ({ data }) => {
        const now = new Date();
        const row = {
          id: nextId('lot'),
          lotNumber: null,
          startingPrice: null,
          reservePrice: null,
          bidIncrement: null,
          currentHighestBid: 0,
          currentHighestBidderId: null,
          totalBidsCount: 0,
          startTime: null,
          endTime: null,
          originalEndTime: null,
          isExtended: false,
          staffNote: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        auctionItems.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }) => {
        const lot = auctionItems.get(where.id);
        if (!lot) return null;
        return { ...lot, auction: auctions.get(lot.auctionId) ?? null };
      },
      findFirst: async ({ where }) => {
        for (const lot of auctionItems.values()) {
          if (where.id && lot.id !== where.id) continue;
          if (where.auctionId && lot.auctionId !== where.auctionId) continue;
          if (where.status && lot.status !== where.status) continue;
          if (where.sellerId && lot.sellerId !== where.sellerId) continue;
          return { ...lot, auction: auctions.get(lot.auctionId) ?? null };
        }
        return null;
      },
      findMany: async ({ where, include } = {}) => {
        return [...auctionItems.values()]
          .filter((lot) => {
            if (!where) return true;
            if (where.auctionId && lot.auctionId !== where.auctionId) return false;
            if (where.status && lot.status !== where.status) return false;
            if (where.sellerId && lot.sellerId !== where.sellerId) return false;
            if (where.lotStatus?.in && !where.lotStatus.in.includes(lot.lotStatus)) return false;
            return true;
          })
          .map((lot) => {
            if (!include) return { ...lot };
            return {
              ...lot,
              seller: lot.sellerId ? (users.get(lot.sellerId) ?? null) : null,
              reviewedByAdmin: lot.reviewedByAdminId
                ? (users.get(lot.reviewedByAdminId) ?? null)
                : null,
            };
          });
      },
      aggregate: async ({ where }) => {
        let maxLot = null;
        for (const lot of auctionItems.values()) {
          if (lot.auctionId === where.auctionId && lot.status === where.status && lot.lotNumber) {
            maxLot = maxLot === null ? lot.lotNumber : Math.max(maxLot, lot.lotNumber);
          }
        }
        return { _max: { lotNumber: maxLot } };
      },
      update: async ({ where, data }) => {
        const lot = auctionItems.get(where.id);
        applyNumericOps(lot, data);
        return { ...lot };
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const lot of auctionItems.values()) {
          if (lot.auctionId === where.auctionId && lot.status === where.status) {
            applyNumericOps(lot, data);
            count++;
          }
        }
        return { count };
      },
    },
    bid: {
      create: async ({ data }) => {
        const row = { id: nextId('bid'), status: 'ACCEPTED', ...data };
        bids.push(row);
        return row;
      },
      findFirst: async ({ where, orderBy }) => {
        const filtered = bids.filter((b) => {
          if (where.auctionId && b.auctionId !== where.auctionId) return false;
          if (where.auctionItemId && b.auctionItemId !== where.auctionItemId) return false;
          if (where.bidderId?.not && b.bidderId === where.bidderId.not) return false;
          if (where.status && b.status !== where.status) return false;
          if (where.bidAmount?.gte !== undefined && Number(b.bidAmount) < where.bidAmount.gte) {
            return false;
          }
          if (where.bidder?.trustLevel?.not) {
            const u = users.get(b.bidderId);
            if (u && u.trustLevel === where.bidder.trustLevel.not) return false;
          }
          return true;
        });
        if (!filtered.length) return null;
        filtered.sort((a, b) => {
          if (Array.isArray(orderBy)) {
            const diff = Number(b.bidAmount) - Number(a.bidAmount);
            if (diff !== 0) return diff;
            return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
          }
          return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime();
        });
        return filtered[0];
      },
      findMany: async ({ where } = {}) =>
        bids.filter((b) => (!where?.bidderId ? true : b.bidderId === where.bidderId)),
    },
    order: {
      create: async ({ data }) => {
        const row = {
          id: nextId('ord'),
          ...data,
          items: data.items?.create ? [{ id: nextId('oi'), ...data.items.create }] : [],
        };
        orders.set(row.id, row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = orders.get(where.id);
        Object.assign(row, data);
        return { ...row };
      },
    },
    payment: {
      create: async ({ data }) => {
        const row = { id: nextId('pay'), ...data };
        payments.push(row);
        return row;
      },
    },
    auctionAward: {
      findUnique: async ({ where }) => {
        for (const a of awards.values()) {
          if (where.id && a.id === where.id) return attachAwardRelations(a);
          if (where.bidId && a.bidId === where.bidId) return attachAwardRelations(a);
        }
        return null;
      },
      findUniqueOrThrow: async ({ where }) => {
        const found = await db.auctionAward.findUnique({ where });
        if (!found) throw new Error('Award not found');
        return found;
      },
      findMany: async ({ where } = {}) => {
        const list = [...awards.values()].filter((a) => {
          if (!where) return true;
          if (where.buyerId && a.buyerId !== where.buyerId) return false;
          if (where.tier && a.tier !== where.tier) return false;
          if (where.status?.in && !where.status.in.includes(a.status)) return false;
          if (where.status && typeof where.status === 'string' && a.status !== where.status) {
            return false;
          }
          if (where.OR) {
            return where.OR.some((clause) => {
              if (clause.buyerId && a.buyerId === clause.buyerId) return true;
              const o = a.orderId ? orders.get(a.orderId) : null;
              return Boolean(clause.order?.buyerId && o?.buyerId === clause.order.buyerId);
            });
          }
          return true;
        });
        return list.map(attachAwardRelations);
      },
      count: async ({ where } = {}) => {
        return [...awards.values()].filter((a) => {
          if (where?.auctionId && a.auctionId !== where.auctionId) return false;
          if (where?.status?.in && !where.status.in.includes(a.status)) return false;
          return true;
        }).length;
      },
      create: async ({ data }) => {
        const now = new Date();
        const row = { id: nextId('awd'), createdAt: now, updatedAt: now, ...data };
        awards.set(row.id, row);
        return { ...row };
      },
      update: async ({ where, data }) => {
        const row = awards.get(where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return { ...row };
      },
    },
    auctionComplaint: {
      create: async ({ data }) => {
        const row = { id: nextId('cmp'), createdAt: new Date(), updatedAt: new Date(), ...data };
        complaints.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }) => {
        const row = complaints.get(where.id);
        if (!row) return null;
        return { ...row, auction: auctions.get(row.auctionId) ?? null };
      },
      findMany: async ({ where } = {}) => {
        return [...complaints.values()].filter((c) => {
          if (where?.auctionId && c.auctionId !== where.auctionId) return false;
          if (where?.status && c.status !== where.status) return false;
          if (where?.reporterId && c.reporterId !== where.reporterId) return false;
          return true;
        });
      },
      update: async ({ where, data }) => {
        const row = complaints.get(where.id);
        Object.assign(row, data);
        return { ...row };
      },
    },
    userAddress: {
      findFirst: async ({ where }) =>
        where.id
          ? {
              id: where.id,
              userId: where.userId,
              recipientName: 'Buyer',
              phone: '0900000001',
              city: 'Ho Chi Minh',
              district: 'Quan 1',
              ward: 'Ben Nghe',
              street: '123 Le Loi',
              country: 'VN',
            }
          : null,
    },
    chatConversation: {
      findMany: async () => [],
    },
    notification: {
      create: async ({ data }) => {
        const row = { id: nextId('noti'), createdAt: new Date(), ...data };
        notifications.push(row);
        return row;
      },
      createMany: async ({ data }) => {
        for (const item of data) {
          notifications.push({ id: nextId('noti'), createdAt: new Date(), ...item });
        }
        return { count: data.length };
      },
    },
    ...overrides.db,
  };

  const shipping = {
    quote: async () => ({
      fee: { total: 50_000 },
      origin: { city: 'Ho Chi Minh' },
      parcel: { items: [] },
      request: { serviceTypeId: 2 },
    }),
  };

  const escrow = {
    heldOrders: [],
    hold: async (_tx, order) => {
      escrow.heldOrders.push(order);
    },
  };

  const reputation = {
    adjustScore: async (dto) => {
      reputationCalls.push(dto);
      const u = users.get(dto.userId);
      if (u) {
        u.reputationScore = Math.max(0, u.reputationScore + dto.deltaPoints);
      }
      return { userId: dto.userId, score: u?.reputationScore ?? 0 };
    },
  };

  const adminSettings = {
    getAll: async () => ({ platformFeePercentage: 7 }),
  };

  const adminFinance = {
    getOrCreatePrimaryAdminWallet: async () => wallets.get('admin-1'),
    getOrCreateEscrowWallet: async () => wallets.get('admin-1'),
    getOrCreatePlatformRevenueWallet: async () => wallets.get('admin-1'),
  };

  const chatService = {
    requests: [],
    requestSupport: async (userId, role, dto) => {
      const ticket = { id: 'conv-1', userId, role, ...dto };
      chatService.requests.push(ticket);
      return ticket;
    },
  };

  const checkoutService = new AuctionCheckoutService(
    db,
    shipping,
    escrow,
    new AuctionSecondChanceHelper(db, reputation, adminSettings, adminFinance, undefined),
  );
  // Helpers are injected now, so the fixture builds them from the same
  // doubles the service used to hand them.
  const auctionService = new AuctionService(
    db,
    gateway,
    {},
    new AuctionAdminHelper(db, gateway),
    new AuctionConsignmentHelper(db, chatService),
    new AuctionBiddingHelper(db, gateway, checkoutService),
  );
  const complaintService = new AuctionComplaintService(db);
  const orderService = new OrderService(
    db,
    shipping,
    new OrderPaymentHelper(
      db,
      {},
      { next: async () => 1_000_000_000_001 },
      { get: () => '' },
      escrow,
      undefined,
      undefined,
      adminFinance,
    ),
  );
  const walletDeposits = new WalletDepositService(
    db,
    {},
    { next: async () => 1_000_000_000_001 },
    { get: () => '' },
    checkoutService,
  );

  return {
    db,
    users,
    wallets,
    auctions,
    auctionItems,
    bids,
    awards,
    orders,
    payments,
    notifications,
    walletTransactions,
    complaints,
    reputationCalls,
    broadcasts,
    escrow,
    chatService,
    checkoutService,
    auctionService,
    complaintService,
    orderService,
    walletDeposits,
  };
}

async function setupLiveTwoLotRoom(h) {
  const start = new Date(Date.now() + 60_000).toISOString();
  const consDead = new Date(Date.now() + 1_800_000).toISOString();
  const end = new Date(Date.now() + 3_600_000).toISOString();
  const room = await h.auctionService.adminCreateAuction('admin-1', {
    title: 'Heritage Luxury Session',
    startTime: start,
    consignmentDeadline: consDead,
    endTime: end,
  });

  const item1 = await h.auctionService.registerAuctionItem(room.id, 'seller-1', {
    title: 'Lot Watch #1',
    description: 'Mechanical timepiece with certificate',
    images: ['https://example.invalid/watch1.jpg'],
    certificateImages: ['https://example.invalid/cert1.jpg'],
    proposedStartingPrice: 1_000_000,
    proposedReservePrice: 1_000_000,
    proposedBidIncrement: 100_000,
    weightGrams: 400,
    lengthCm: 15,
    widthCm: 15,
    heightCm: 10,
  });

  const item2 = await h.auctionService.registerAuctionItem(room.id, 'seller-1', {
    title: 'Lot Bracelet #2',
    description: '18K gold bracelet',
    images: ['https://example.invalid/bracelet2.jpg'],
    certificateImages: ['https://example.invalid/cert2.jpg'],
    proposedStartingPrice: 2_000_000,
    proposedBidIncrement: 200_000,
  });

  await h.auctionService.adminReviewAuctionItem(item1.id, 'admin-1', { action: 'APPROVE' });
  await h.auctionService.adminReviewAuctionItem(item2.id, 'admin-1', { action: 'APPROVE' });
  await h.auctionService.adminStartAuction(room.id);

  // Move room and lots past intro playback duration so bidding is open
  const pastStart = new Date(Date.now() - 120_000);
  const auctionRow = h.auctions.get(room.id);
  auctionRow.startTime = pastStart;

  return { room, lot1: h.auctionItems.get(item1.id), lot2: h.auctionItems.get(item2.id) };
}

test('adminCreateAuction notifies only eligible Sellers at creation, while adminStartAuction notifies Buyers', async () => {
  const h = createHarness();
  const start = new Date(Date.now() + 60_000).toISOString();
  const consDead = new Date(Date.now() + 1_800_000).toISOString();
  const end = new Date(Date.now() + 3_600_000).toISOString();

  await assert.rejects(
    h.auctionService.adminCreateAuction('admin-1', {
      title: 'Invalid Timeline',
      startTime: consDead,
      consignmentDeadline: start,
      endTime: end,
    }),
    BadRequestException,
  );

  const room = await h.auctionService.adminCreateAuction('admin-1', {
    title: 'Multi-Lot Opening',
    startTime: start,
    consignmentDeadline: consDead,
    endTime: end,
  });

  const creationTargets = h.notifications.map((n) => n.userId);
  assert.deepEqual(creationTargets, ['seller-1']);
  assert.equal(h.notifications[0].metadata.actionType, 'AUCTION_CONSIGNMENT_OPENED');

  await assert.rejects(
    h.auctionService.adminStartAuction(room.id),
    /chưa có vật phẩm nào được duyệt/,
  );

  const item = await h.auctionService.registerAuctionItem(room.id, 'seller-1', {
    title: 'Rare Artifact',
    description: 'Certified heirloom',
    images: ['https://example.invalid/a.jpg'],
    certificateImages: ['https://example.invalid/c.jpg'],
    proposedStartingPrice: 1_500_000,
    proposedReservePrice: 1_200_000,
  });
  await h.auctionService.adminReviewAuctionItem(item.id, 'admin-1', { action: 'APPROVE' });

  h.notifications.length = 0;
  await h.auctionService.adminStartAuction(room.id);

  assert.equal(h.broadcasts.started.length, 1);
  assert.equal(h.broadcasts.started[0].items.length, 1);
  const startNotifiedUsers = new Set(h.notifications.map((n) => n.userId));
  assert.equal(startNotifiedUsers.has('buyer-1'), true);
  assert.equal(startNotifiedUsers.has('buyer-2'), true);
  assert.equal(startNotifiedUsers.has('seller-1'), true);
  assert.equal(startNotifiedUsers.has('admin-1'), false);
});

test('adminReviewAuctionItem rejects startingPrice below reservePrice and blocks bids during intro showcase', async () => {
  const h = createHarness();
  const room = await h.auctionService.adminCreateAuction('admin-1', {
    title: 'Intro Lock Room',
    startTime: new Date(Date.now() + 60_000).toISOString(),
    endTime: new Date(Date.now() + 3_600_000).toISOString(),
  });
  const item = await h.auctionService.registerAuctionItem(room.id, 'seller-1', {
    title: 'Emerald Ring',
    description: 'Certified emerald ring',
    images: ['https://example.invalid/ring.jpg'],
    certificateImages: ['https://example.invalid/ring-cert.jpg'],
    proposedStartingPrice: 1_000_000,
    proposedReservePrice: 1_000_000,
  });

  await assert.rejects(
    h.auctionService.adminReviewAuctionItem(item.id, 'admin-1', {
      action: 'APPROVE',
      startingPrice: 900_000,
      reservePrice: 1_000_000,
    }),
    BadRequestException,
  );

  await h.auctionService.adminReviewAuctionItem(item.id, 'admin-1', { action: 'APPROVE' });
  await h.auctionService.adminStartAuction(room.id);

  await assert.rejects(
    h.auctionService.placeBid(room.id, 'buyer-1', {
      auctionItemId: item.id,
      bidAmount: 1_000_000,
    }),
    /đang phát đoạn giới thiệu 3D/,
  );
});

test('multi-lot per-lot bidding enforces Seller view-only mode, 100% escrow lock/unlock, and per-lot +120s anti-sniping', async () => {
  const h = createHarness();
  const { room, lot1, lot2 } = await setupLiveTwoLotRoom(h);

  // Seller in Seller mode is restricted to viewing only
  await assert.rejects(
    h.auctionService.placeBid(room.id, 'seller-1', {
      auctionItemId: lot2.id,
      bidAmount: 2_000_000,
    }),
    ForbiddenException,
  );

  // Switching Seller account back to Buyer mode still blocks bidding on own item, but allows bidding elsewhere
  h.users.get('seller-1').isSellerActive = false;
  await assert.rejects(
    h.auctionService.placeBid(room.id, 'seller-1', {
      auctionItemId: lot1.id,
      bidAmount: 1_000_000,
    }),
    /không thể tự đặt giá cho vật phẩm của chính mình/,
  );

  // Missing auctionItemId rejected when multiple lots exist
  await assert.rejects(
    h.auctionService.placeBid(room.id, 'buyer-1', { bidAmount: 1_000_000 }),
    /có nhiều lô hàng/,
  );

  // Set lot1 close to end (90s remaining) to test per-lot +120s anti-sniping
  const soon = new Date(Date.now() + 90_000);
  h.auctionItems.get(lot1.id).endTime = soon;
  const lot2OrigEnd = new Date(h.auctionItems.get(lot2.id).endTime.getTime());

  const bid1 = await h.auctionService.placeBid(room.id, 'buyer-1', {
    auctionItemId: lot1.id,
    bidAmount: 1_000_000,
  });
  assert.equal(bid1.extended, true);
  assert.equal(h.broadcasts.extended.length, 1);
  assert.equal(h.broadcasts.extended[0].auctionItemId, lot1.id);
  assert.equal(h.broadcasts.extended[0].extendedBySeconds, 120);
  assert.equal(h.wallets.get('buyer-1').lockedBalance, 1_000_000);
  assert.equal(h.wallets.get('buyer-1').balance, 19_000_000);
  assert.equal(h.auctionItems.get(lot2.id).endTime.getTime(), lot2OrigEnd.getTime());

  // Buyer 2 bids on Lot 2 independently
  await h.auctionService.placeBid(room.id, 'buyer-2', {
    auctionItemId: lot2.id,
    bidAmount: 2_000_000,
  });
  assert.equal(h.wallets.get('buyer-2').lockedBalance, 2_000_000);

  // Buyer 2 outbids Buyer 1 on Lot 1 -> Buyer 1 gets 100% refunded immediately
  await h.auctionService.placeBid(room.id, 'buyer-2', {
    auctionItemId: lot1.id,
    bidAmount: 1_200_000,
  });
  assert.equal(h.wallets.get('buyer-1').lockedBalance, 0);
  assert.equal(h.wallets.get('buyer-1').balance, 20_000_000);
  assert.equal(h.wallets.get('buyer-2').lockedBalance, 3_200_000);
});

test('adminEndLot refunds 70%, keeps 30% deposit, and checkout collects remaining 70% + GHN shipping', async () => {
  const h = createHarness();
  const { room, lot1 } = await setupLiveTwoLotRoom(h);

  await h.auctionService.placeBid(room.id, 'buyer-1', {
    auctionItemId: lot1.id,
    bidAmount: 1_000_000,
  });
  await h.auctionService.placeBid(room.id, 'buyer-2', {
    auctionItemId: lot1.id,
    bidAmount: 1_500_000,
  });

  const ended = await h.auctionService.adminEndLot(room.id, lot1.id, 'admin-1');
  assert.equal(ended.lotStatus, 'ENDED');
  assert.equal(ended.winningBidderId, 'buyer-2');

  // 70% of 1.5M (1.05M) refunded to balance; 30% (450k) kept locked
  const buyer2Wallet = h.wallets.get('buyer-2');
  assert.equal(buyer2Wallet.lockedBalance, 450_000);
  assert.equal(buyer2Wallet.balance, 19_550_000);

  const awards = await h.checkoutService.list('buyer-2');
  assert.equal(awards.length, 1);
  assert.equal(awards[0].tier, 'PRIMARY_WINNER');
  assert.equal(awards[0].depositAmount, 450_000);
  assert.equal(awards[0].remainingProductAmount, 1_050_000);

  // Checkout charges remaining 1.05M + 50k GHN shipping from balance, and consumes 450k lockedBalance
  const paidOrder = await h.checkoutService.checkout(awards[0].id, 'buyer-2', {
    recipientName: 'Buyer Two',
    phone: '0900000002',
    city: 'Ho Chi Minh',
    street: '100 Nguyen Hue',
  });
  assert.equal(paidOrder.status, 'PAID');
  assert.equal(paidOrder.totalAmount, 1_550_000);
  assert.equal(h.wallets.get('buyer-2').lockedBalance, 0);
  assert.equal(h.wallets.get('buyer-2').balance, 18_450_000);
  assert.equal(h.auctionItems.get(lot1.id).lotStatus, 'SETTLED');
});

test('PRIMARY_WINNER payment default forfeits 30% deposit (93% Seller / 7% Admin fee), deducts 10 rep, hides revoked offer, and invites SECOND_CHANCE', async () => {
  const h = createHarness();
  const { room, lot1, lot2 } = await setupLiveTwoLotRoom(h);

  await h.auctionService.placeBid(room.id, 'buyer-1', {
    auctionItemId: lot1.id,
    bidAmount: 1_000_000,
  });
  await h.auctionService.placeBid(room.id, 'buyer-2', {
    auctionItemId: lot1.id,
    bidAmount: 2_000_000,
  });

  const ended = await h.auctionService.adminEndLot(room.id, lot1.id, 'admin-1');
  const sellerBefore = h.wallets.get('seller-1').balance;
  const adminBefore = h.wallets.get('admin-1').balance;

  const defaulted = await h.checkoutService.markPaymentDefault(
    ended.awardId,
    'admin-1',
    'Khong thanh toan dung han 24h',
  );
  assert.ok(defaulted.secondChanceAwardId);

  // 30% of 2M = 600,000 forfeited -> 7% fee = 42,000 to Admin; 93% = 558,000 to Seller
  assert.equal(h.wallets.get('buyer-2').lockedBalance, 0);
  assert.equal(h.wallets.get('admin-1').balance - adminBefore, 42_000);
  assert.equal(h.wallets.get('seller-1').balance - sellerBefore, 558_000);
  assert.equal(h.users.get('buyer-2').reputationScore, 90);
  assert.equal(h.reputationCalls.at(-1).penaltyType, 'AUCTION_DEFAULT');

  // Revoked primary offer disappears when buyer-2 reloads their awards list
  assert.equal((await h.checkoutService.list('buyer-2')).length, 0);
  const appealNotif = h.notifications.find(
    (n) => n.userId === 'buyer-2' && n.metadata?.actionType === 'AUCTION_PAYMENT_DEFAULTED',
  );
  assert.equal(appealNotif.metadata.canFileComplaint, true);

  // Buyer-1 receives SECOND_CHANCE at their own 1,000,000 bid (300,000 deposit required)
  const secondOffer = h.awards.get(defaulted.secondChanceAwardId);
  assert.equal(secondOffer.tier, 'SECOND_CHANCE');
  assert.equal(secondOffer.status, 'AWAITING_ACCEPTANCE');
  assert.equal(secondOffer.offerAmount, 1_000_000);
  assert.equal(secondOffer.depositAmount, 300_000);

  // Keep Buyer-1 balance at 100k to test insufficient top-up flow -> deposit auto-lock!
  h.wallets.get('buyer-1').balance = 100_000;
  const accepted = await h.checkoutService.respondSecondChance(secondOffer.id, 'buyer-1', true);
  assert.equal(accepted.status, 'AWAITING_DEPOSIT');

  const topupNotif = h.notifications.find(
    (n) => n.userId === 'buyer-1' && n.metadata?.actionType === 'SECOND_CHANCE_TOPUP_REQUIRED',
  );
  assert.equal(topupNotif.metadata.requiredDepositAmount, 300_000);
  assert.equal(topupNotif.metadata.missingAmount, 200_000);

  // Topping up the wallet automatically locks the 300k deposit and opens AWAITING_CHECKOUT
  await h.walletDeposits.depositToUserWallet('buyer-1', { amount: 250_000 });
  const promoted = h.awards.get(secondOffer.id);
  assert.equal(promoted.status, 'AWAITING_CHECKOUT');
  assert.ok(promoted.orderId);
  assert.equal(h.wallets.get('buyer-1').balance, 50_000);
  assert.equal(h.wallets.get('buyer-1').lockedBalance, 300_000);

  // If Admin confirms second-chance withdrawal ("Khách không mua nữa"), 30% deposit is refunded without penalty
  await h.checkoutService.withdrawSecondChanceByAdmin(
    secondOffer.id,
    'admin-1',
    'Khách xin rút được Admin duyệt',
  );
  const withdrawn = h.awards.get(secondOffer.id);
  assert.equal(withdrawn.status, 'BUYER_WITHDRAWN');
  assert.equal(h.wallets.get('buyer-1').lockedBalance, 0);
  assert.equal(h.wallets.get('buyer-1').balance, 350_000);
  assert.equal(h.users.get('buyer-1').reputationScore, 100);
  assert.equal(h.auctionItems.get(lot1.id).lotStatus, 'FAILED');

  // Verify SECOND_CHANCE decline never penalizes and never passes to a 3rd bidder
  h.wallets.get('buyer-1').balance = 20_000_000;
  await h.auctionService.placeBid(room.id, 'buyer-1', {
    auctionItemId: lot2.id,
    bidAmount: 2_000_000,
  });
  await h.auctionService.placeBid(room.id, 'buyer-2', {
    auctionItemId: lot2.id,
    bidAmount: 2_500_000,
  });
  await h.auctionService.placeBid(room.id, 'buyer-3', {
    auctionItemId: lot2.id,
    bidAmount: 3_000_000,
  });
  const lot2End = await h.auctionService.adminEndLot(room.id, lot2.id, 'admin-1');
  const lot2Default = await h.checkoutService.markPaymentDefault(lot2End.awardId, 'admin-1');
  await h.checkoutService.respondSecondChance(lot2Default.secondChanceAwardId, 'buyer-2', false);
  assert.equal(h.users.get('buyer-2').reputationScore, 90);
  assert.equal(h.auctionItems.get(lot2.id).lotStatus, 'FAILED');
});

test('SECOND_CHANCE buyer accepting with sufficient balance locks 30% immediately and defaults forfeit without reaching 3rd bidder', async () => {
  const h = createHarness();
  const { room, lot1 } = await setupLiveTwoLotRoom(h);

  await h.auctionService.placeBid(room.id, 'buyer-1', {
    auctionItemId: lot1.id,
    bidAmount: 1_000_000,
  });
  await h.auctionService.placeBid(room.id, 'buyer-2', {
    auctionItemId: lot1.id,
    bidAmount: 1_500_000,
  });
  await h.auctionService.placeBid(room.id, 'buyer-3', {
    auctionItemId: lot1.id,
    bidAmount: 2_000_000,
  });

  const ended = await h.auctionService.adminEndLot(room.id, lot1.id, 'admin-1');
  const primaryDefault = await h.checkoutService.markPaymentDefault(ended.awardId, 'admin-1');
  const secondOffer = await h.checkoutService.respondSecondChance(
    primaryDefault.secondChanceAwardId,
    'buyer-2',
    true,
  );
  assert.equal(secondOffer.status, 'AWAITING_CHECKOUT');
  assert.ok(secondOffer.orderId);
  assert.equal(h.wallets.get('buyer-2').lockedBalance, 450_000);

  // If SECOND_CHANCE also misses 24h checkout, 30% is forfeited, -10 rep applied, and NO 3rd bidder receives an offer
  const sellerBefore = h.wallets.get('seller-1').balance;
  const secondDefault = await h.checkoutService.markPaymentDefault(secondOffer.id, 'admin-1');
  assert.equal(secondDefault.secondChanceAwardId, null);
  assert.equal(secondDefault.lotStatus, 'FAILED');
  assert.equal(h.users.get('buyer-2').reputationScore, 90);
  assert.equal(h.wallets.get('buyer-2').lockedBalance, 0);
  assert.equal(h.wallets.get('seller-1').balance - sellerBefore, 418_500);
  assert.equal(h.awards.size, 2);
});

test('single-bidder reserve rule, AuctionComplaint lifecycle, Support Staff controls, and role enforcement', async () => {
  const h = createHarness();
  const { room, lot1 } = await setupLiveTwoLotRoom(h);

  // Single bidder cannot place below reserve price even when starting/reserve equal
  await assert.rejects(
    h.auctionService.placeBid(room.id, 'buyer-1', { auctionItemId: lot1.id, bidAmount: 900_000 }),
    BadRequestException,
  );

  // Seller submits complaint -> Admin accepts -> Seller receives notification
  const sellerComplaint = await h.complaintService.createComplaint(room.id, 'seller-1', 'SELLER', {
    auctionItemId: lot1.id,
    reason: 'Người mua chưa thanh toán sau 24 giờ.',
  });
  assert.equal(sellerComplaint.status, 'OPEN');

  const resolved = await h.complaintService.resolveComplaint(sellerComplaint.id, 'admin-1', {
    status: 'ACCEPTED',
    adminNote: 'Đã tiếp nhận và kiểm tra.',
  });
  assert.equal(resolved.status, 'ACCEPTED');
  assert.ok(
    h.notifications.some(
      (n) => n.userId === 'seller-1' && n.metadata?.actionType === 'AUCTION_COMPLAINT_RESOLVED',
    ),
  );

  // Support Staff adds note and requests overview, and User opens auction support chat
  const noted = await h.auctionService.staffAddItemNote(lot1.id, 'staff-1', {
    staffNote: 'Đã xác minh chứng thư GIA.',
  });
  assert.equal(noted.staffNote, 'Đã xác minh chứng thư GIA.');
  const overview = await h.auctionService.getStaffOverview();
  assert.equal(overview.auctions.length, 1);

  const ticket = await h.auctionService.requestAuctionSupportChat(
    room.id,
    'buyer-1',
    'BUYER',
    'Tôi cần hỏi về phí ship GHN.',
  );
  assert.equal(ticket.contextType, 'AUCTION');
  assert.equal(ticket.contextId, room.id);

  // HTTP role test: SUPPORT_STAFF can review, lock-consignment, start, and end lots (200),
  // while create/update/delete remain ADMIN-only (403) and BUYER is rejected (403).
  const staffRoom = await h.auctionService.adminCreateAuction('admin-1', {
    title: 'Staff Operational Flow Room',
    startTime: new Date(Date.now() + 60_000).toISOString(),
    endTime: new Date(Date.now() + 3_600_000).toISOString(),
    minReputationScore: 60,
  });
  const staffLot = await h.auctionService.registerAuctionItem(staffRoom.id, 'seller-1', {
    title: 'Staff Reviewed Lot',
    description: 'Certified luxury item for staff flow test',
    images: ['https://example.invalid/staff-lot.jpg'],
    certificateImages: ['https://example.invalid/staff-cert.jpg'],
    proposedStartingPrice: 1_000_000,
    proposedBidIncrement: 100_000,
    weightGrams: 500,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
  });

  class FixtureModule {}
  Module({
    controllers: [AuctionController],
    providers: [
      {
        // The bearer value is the account id; the role comes from the same
        // fixture users the Prisma mock serves.
        provide: TokenAuthService,
        useValue: {
          authenticate: async (token) => {
            const account = await h.db.user.findUnique({ where: { id: token } });
            if (!account) throw new Error('unknown fixture identity');
            return {
              id: token,
              sub: token,
              email: account.email ?? 'fixture@example.invalid',
              role: account.role,
              accountRole: account.role,
              activeRole: account.role,
              currentMode: 'BUYER',
              isSellerActive: Boolean(account.isSellerActive),
            };
          },
        },
      },
      { provide: PrismaService, useValue: h.db },
      { provide: ConfigService, useValue: { get: () => 'auction-role-secret' } },
      { provide: AuctionService, useValue: h.auctionService },
      { provide: AuctionComplaintService, useValue: h.complaintService },
      { provide: AuctionCheckoutService, useValue: h.checkoutService },
    ],
  })(FixtureModule);

  const app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false });
  const jwt = new JwtService({ secret: 'auction-role-secret' });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const staffHeaders = {
      Authorization: 'Bearer staff-1',
      'Content-Type': 'application/json',
    };
    const buyerHeaders = {
      Authorization: 'Bearer buyer-1',
      'Content-Type': 'application/json',
    };

    // BUYER cannot call Staff operational endpoints
    for (const [method, path, body] of [
      ['POST', `/auctions/admin/items/${staffLot.id}/review`, { action: 'APPROVE' }],
      ['POST', `/auctions/admin/${staffRoom.id}/lock-consignment`],
      ['POST', `/auctions/admin/${staffRoom.id}/start`],
      ['POST', `/auctions/admin/${staffRoom.id}/items/${staffLot.id}/end`],
    ]) {
      const buyerRes = await fetch(`${base}${path}`, {
        method,
        headers: buyerHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(buyerRes.status, 403);
    }

    // SUPPORT_STAFF cannot create, update, or delete auction rooms
    for (const [method, path, body] of [
      ['POST', '/auctions/admin', { title: 'Blocked' }],
      ['PATCH', `/auctions/admin/${staffRoom.id}`, { title: 'Blocked' }],
      ['DELETE', `/auctions/admin/${staffRoom.id}`],
    ]) {
      const deniedRes = await fetch(`${base}${path}`, {
        method,
        headers: staffHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(deniedRes.status, 403);
    }

    // SUPPORT_STAFF passes RolesGuard on all 4 operational endpoints (hits ParseUUIDPipe 400 with fixture IDs, not 401/403)
    for (const [method, path, body] of [
      ['POST', `/auctions/admin/items/${staffLot.id}/review`, { action: 'APPROVE' }],
      ['POST', `/auctions/admin/${staffRoom.id}/lock-consignment`],
      ['POST', `/auctions/admin/${staffRoom.id}/start`],
      ['POST', `/auctions/admin/${staffRoom.id}/items/${staffLot.id}/end`],
    ]) {
      const staffRes = await fetch(`${base}${path}`, {
        method,
        headers: staffHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(staffRes.status, 400);
    }

    // Service-level end-to-end operational flow executed by Support Staff ('staff-1')
    const reviewedByStaff = await h.auctionService.adminReviewAuctionItem(staffLot.id, 'staff-1', {
      action: 'APPROVE',
    });
    assert.equal(reviewedByStaff.status, 'APPROVED');
    assert.equal(reviewedByStaff.reviewedByAdminId, 'staff-1');

    const lockedByStaff = await h.auctionService.adminLockConsignment(staffRoom.id);
    assert.equal(lockedByStaff.isConsignmentLocked, true);

    const startedByStaff = await h.auctionService.adminStartAuction(staffRoom.id);
    assert.equal(startedByStaff.status, 'ACTIVE');

    const endedByStaff = await h.auctionService.adminEndLot(staffRoom.id, staffLot.id, 'staff-1');
    assert.equal(endedByStaff.lotStatus, 'FAILED');
  } finally {
    await app.close();
  }
});

test('AuctionGateway enforces ADMIN-only 3D sync and emits BID_REJECTED on unauthenticated or invalid WebSocket bids', async () => {
  const gateway = new AuctionGateway({ get: () => 'ws-secret' });
  const roomEmits = [];
  gateway.server = {
    to: (room) => ({
      emit: (event, payload) => roomEmits.push({ room, event, payload }),
    }),
  };

  const clientEmits = [];
  const guestSocket = {
    id: 'sock-1',
    data: {},
    emit: (event, payload) => clientEmits.push({ event, payload }),
    to: () => ({ emit: () => {} }),
  };

  const unauthRes = await gateway.handlePlaceBid(guestSocket, {
    auctionId: 'auc-1',
    auctionItemId: 'lot-1',
    bidAmount: 1_000_000,
  });
  assert.equal(unauthRes.ok, false);
  assert.equal(clientEmits[0].event, WS_AUCTION_EVENTS.SERVER.BID_REJECTED);

  // Non-Admin cannot broadcast 3D camera viewport sync
  const buyerSocket = {
    id: 'sock-2',
    data: { user: { id: 'buyer-1', role: 'BUYER' } },
    emit: (event, payload) => clientEmits.push({ event, payload }),
    to: () => ({ emit: (event, payload) => roomEmits.push({ event, payload }) }),
  };
  gateway.handleSyncViewport(buyerSocket, { auctionId: 'auc-1', cameraPosition: [0, 1, 2] });
  assert.equal(roomEmits.length, 0);
  assert.equal(clientEmits.at(-1).event, WS_AUCTION_EVENTS.SERVER.ERROR);

  // Authenticated bid calls registered handler and forwards BID_REJECTED on error
  gateway.registerPlaceBidHandler(async (_aucId, _itemId, _userId, bidAmount) => {
    if (bidAmount < 1_000_000) throw new BadRequestException('Giá đặt quá thấp');
    return { bidId: 'bid-ws-1', bidAmount };
  });

  const lowRes = await gateway.handlePlaceBid(buyerSocket, {
    auctionId: 'auc-1',
    auctionItemId: 'lot-1',
    bidAmount: 500_000,
  });
  assert.equal(lowRes.ok, false);
  assert.equal(clientEmits.at(-1).event, WS_AUCTION_EVENTS.SERVER.BID_REJECTED);
  assert.equal(clientEmits.at(-1).payload.message, 'Giá đặt quá thấp');

  const okRes = await gateway.handlePlaceBid(buyerSocket, {
    auctionId: 'auc-1',
    auctionItemId: 'lot-1',
    bidAmount: 1_500_000,
  });
  assert.equal(okRes.ok, true);
  assert.equal(okRes.data.bidId, 'bid-ws-1');
});

test('getAuctions returns pagination metadata, targetUrl, and room summary relations for Admin UI', async () => {
  const { auctionService } = createHarness();
  const created = await auctionService.adminCreateAuction('admin-1', {
    title: 'Heritage Auction 2026',
    description: 'Curated luxury lots',
    startTime: new Date(Date.now() + 3600_000).toISOString(),
    endTime: new Date(Date.now() + 7200_000).toISOString(),
    minBuyerReputation: 40,
    minSellerReputation: 50,
  });

  const list = await auctionService.getAuctions({ page: 1, limit: 10 });
  assert.deepEqual(list.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });
  assert.equal(list.total, 1);
  assert.equal(list.page, 1);
  assert.equal(list.limit, 10);
  assert.equal(list.totalPages, 1);
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].targetUrl, `/auction/${created.id}`);
  assert.equal(list.items[0].createdByAdmin?.id, 'admin-1');

  const detail = await auctionService.getAuctionDetail(created.id, 'admin-1');
  assert.equal(detail.targetUrl, `/auction/${created.id}`);

  const emptyItems = await auctionService.adminGetAuctionItems(created.id);
  assert.equal(emptyItems.auctionId, created.id);
  assert.equal(emptyItems.auctionTitle, 'Heritage Auction 2026');
  assert.equal(emptyItems.auctionStatus, created.status);
  assert.equal(emptyItems.totalCount, 0);
  assert.deepEqual(emptyItems.items, []);

  await auctionService.registerAuctionItem(created.id, 'seller-1', {
    title: 'Vintage Chronograph',
    description: 'Authenticated 18K timepiece',
    images: ['https://example.com/watch.jpg'],
    proposedStartingPrice: 1_000_000,
    certificateImages: ['https://example.com/cert.jpg'],
  });
  const populatedItems = await auctionService.adminGetAuctionItems(created.id);
  assert.equal(populatedItems.totalCount, 1);
  assert.equal(populatedItems.items.length, 1);
  assert.equal(populatedItems.items[0].seller?.id, 'seller-1');
});
