import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { AuctionService } = load('../src/modules/auction/services/auction.service.ts');

const { Prisma } = load('@prisma/client');
function auctionFixture(prisma, gateway) {
  prisma.user ??= {
    findUnique: async () => ({
      id: 'seller-1',
      role: 'SELLER',
      reputationScore: 100,
      trustLevel: 'GOOD',
    }),
  };
  const original = prisma.$transaction?.bind(prisma) ?? ((run) => run(prisma));
  prisma.$transaction = (run) =>
    original((tx) => {
      tx.$queryRaw ??= async () => [];
      tx.user ??= {
        findUnique: async () => ({
          id: 'buyer',
          role: 'BUYER',
          reputationScore: 100,
          trustLevel: 'GOOD',
        }),
      };
      tx.notification ??= { create: async () => ({}) };
      tx.auctionAward ??= { findFirst: async () => null };
      if (tx.wallet) {
        tx.wallet.findUniqueOrThrow ??= tx.wallet.findUnique;
        tx.wallet.updateMany ??= async (input) => {
          await tx.wallet.update(input);
          return { count: 1 };
        };
      }
      return run(tx);
    });
  const service = new AuctionService(
    prisma,
    gateway,
    { reserve: mock.fn(async () => ({})), release: mock.fn(async () => {}) },
    { createAward: mock.fn(async () => ({ id: 'award-1' })) },
  );
  service.checkBuyerEligibility = mock.fn(async () => ({ isEligible: true }));
  return service;
}

function createMockGateway() {
  return {
    broadcastAuctionStarted: mock.fn(),
    broadcastBidPlaced: mock.fn(),
    broadcastTimerSync: mock.fn(),
    broadcastTimeExtended: mock.fn(),
    broadcastAuctionEnded: mock.fn(),
  };
}

test('AuctionService.createAuction validates seller ownership and persists scheduled auction', async () => {
  const prismaMock = {
    product: {
      findUnique: mock.fn(async () => ({
        id: 'prod-1',
        sellerId: 'seller-1',
        title: 'Audemars Piguet Watch',
      })),
    },
    auction: {
      findFirst: mock.fn(async () => null),
      create: mock.fn(async ({ data }) => ({
        id: 'auc-1',
        productId: 'product-1',
        ...data,
      })),
    },
  };

  const gatewayMock = createMockGateway();
  const service = auctionFixture(prismaMock, gatewayMock);

  const result = await service.createAuction('seller-1', {
    productId: 'prod-1',
    title: 'Audemars Piguet Watch Auction',
    startingPrice: 50000000,
    reservePrice: 60000000,
    bidIncrement: 1000000,
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 86400000).toISOString(),
  });

  assert.equal(result.id, 'auc-1');
  assert.equal(result.status, 'SCHEDULED');
  assert.equal(result.startingPrice, 50000000);
});

test('AuctionService.placeBid rejects seller bidding on their own product', async () => {
  const prismaMock = {
    $transaction: mock.fn(async (cb) => {
      const tx = {
        auction: {
          findUnique: mock.fn(async () => ({
            id: 'auc-1',
            productId: 'product-1',
            sellerId: 'user-seller',
            status: 'ACTIVE',
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date(Date.now() + 3600000),
            currentHighestBid: 50000000,
            bidIncrement: 1000000,
            totalBidsCount: 1,
            isExtended: false,
            seller: { id: 'user-seller', fullName: 'Seller Name' },
          })),
        },
      };
      return cb(tx);
    }),
  };

  const service = auctionFixture(prismaMock, createMockGateway());

  await assert.rejects(
    async () => {
      await service.placeBid('auc-1', 'user-seller', { bidAmount: 55000000 });
    },
    { message: /Người bán không được phép tham gia trả giá/ },
  );
});

test('AuctionService.placeBid rejects bid amount below starting price or minimum increment', async () => {
  const prismaMock = {
    $transaction: mock.fn(async (cb) => {
      const tx = {
        auction: {
          findUnique: mock.fn(async () => ({
            id: 'auc-1',
            productId: 'product-1',
            sellerId: 'user-seller',
            status: 'ACTIVE',
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date(Date.now() + 3600000),
            currentHighestBid: 50000000,
            bidIncrement: 2000000,
            totalBidsCount: 1,
            isExtended: false,
            seller: { id: 'user-seller', fullName: 'Seller Name' },
          })),
        },
      };
      return cb(tx);
    }),
  };

  const service = auctionFixture(prismaMock, createMockGateway());

  await assert.rejects(
    async () => {
      // 51,000,000 is below 50,000,000 + 2,000,000 = 52,000,000
      await service.placeBid('auc-1', 'buyer-1', { bidAmount: 51000000 });
    },
    { message: /Mức giá trả tối thiểu hợp lệ là 52\.000\.000 VND/ },
  );
});

test('AuctionService.placeBid rejects when buyer wallet balance is insufficient', async () => {
  const prismaMock = {
    $transaction: mock.fn(async (cb) => {
      const tx = {
        auction: {
          findUnique: mock.fn(async () => ({
            id: 'auc-1',
            productId: 'product-1',
            sellerId: 'user-seller',
            status: 'ACTIVE',
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date(Date.now() + 3600000),
            currentHighestBid: 50000000,
            bidIncrement: 2000000,
            totalBidsCount: 1,
            isExtended: false,
            seller: { id: 'user-seller', fullName: 'Seller Name' },
          })),
        },
        wallet: {
          findUnique: mock.fn(async () => ({
            id: 'wal-1',
            userId: 'buyer-1',
            balance: 10000000,
            lockedBalance: 0,
          })),
        },
      };
      return cb(tx);
    }),
  };

  const service = auctionFixture(prismaMock, createMockGateway());

  await assert.rejects(
    async () => {
      await service.placeBid('auc-1', 'buyer-1', { bidAmount: 55000000 });
    },
    { message: /Số dư khả dụng trong ví NEXUS Pay không đủ/ },
  );
});

test('AuctionService.placeBid triggers anti-sniping extension when placed within last 2 minutes and manages wallet balance locks', async () => {
  const initialEndTime = new Date(Date.now() + 60000);

  const buyerWallet = {
    id: 'wal-buyer2',
    userId: 'buyer-2',
    balance: 100000000,
    lockedBalance: 0,
  };

  const prevBidderWallet = {
    id: 'wal-buyer1',
    userId: 'buyer-1',
    balance: 50000000,
    lockedBalance: 50000000,
  };

  const walletUpdates = [];
  const walletTxs = [];

  const prismaMock = {
    $transaction: mock.fn(async (cb) => {
      const tx = {
        auction: {
          findUnique: mock.fn(async () => ({
            id: 'auc-1',
            productId: 'product-1',
            sellerId: 'user-seller',
            status: 'ACTIVE',
            startTime: new Date(Date.now() - 3600000),
            endTime: initialEndTime,
            currentHighestBid: 50000000,
            currentHighestBidderId: 'buyer-1',
            bidIncrement: 2000000,
            totalBidsCount: 1,
            isExtended: false,
            seller: { id: 'user-seller', fullName: 'Seller Name' },
          })),
          update: mock.fn(async ({ data }) => ({
            id: 'auc-1',
            productId: 'product-1',
            ...data,
          })),
        },
        wallet: {
          findUnique: mock.fn(async ({ where }) => {
            if (where.userId === 'buyer-2') return buyerWallet;
            if (where.userId === 'buyer-1') return prevBidderWallet;
            return null;
          }),
          update: mock.fn(async ({ where, data }) => {
            walletUpdates.push({ where, data });
          }),
        },
        walletTransaction: {
          create: mock.fn(async ({ data }) => {
            walletTxs.push(data);
          }),
        },
        bid: {
          updateMany: mock.fn(async () => ({ count: 1 })),
          create: mock.fn(async ({ data }) => ({
            id: 'bid-2',
            ...data,
            placedAt: new Date(),
            bidder: { id: 'buyer-2', fullName: 'Lê Văn B', avatarUrl: null },
          })),
        },
      };
      return cb(tx);
    }),
  };

  const gatewayMock = createMockGateway();
  const service = auctionFixture(prismaMock, gatewayMock);

  const result = await service.placeBid('auc-1', 'buyer-2', { bidAmount: 55000000 });

  assert.equal(result.success, true);
  assert.equal(result.currentHighestBid, 55000000);
  assert.equal(result.isExtended, true);
  assert.equal(result.status, 'EXTENDED');

  // Verify wallet lock for bidder 2
  const lockUpdate = walletUpdates.find((u) => u.where.id === 'wal-buyer2');
  assert.ok(lockUpdate);
  assert.deepEqual(lockUpdate.data, {
    balance: { decrement: 55000000 },
    lockedBalance: { increment: 55000000 },
  });

  // Verify wallet refund for previous bidder 1
  const refundUpdate = walletUpdates.find((u) => u.where.id === 'wal-buyer1');
  assert.ok(refundUpdate);
  assert.deepEqual(refundUpdate.data, {
    lockedBalance: { decrement: 50000000 },
    balance: { increment: 50000000 },
  });

  // Verify anti-sniping WS broadcast was emitted
  assert.equal(gatewayMock.broadcastTimeExtended.mock.callCount(), 1);
  assert.equal(gatewayMock.broadcastBidPlaced.mock.callCount(), 1);
});

test('AuctionService.endAuction marks auction ENDED and bid WINNING when reserve met', async () => {
  let updatedAuctionStatus = null;
  let updatedBidStatus = null;

  const prismaMock = {
    auction: {
      findUnique: mock.fn(async () => ({
        id: 'auc-1',
        productId: 'product-1',
        sellerId: 'seller-1',
        status: 'ACTIVE',
        endTime: new Date(Date.now() - 1000),
        reservePrice: 50000000,
        bids: [
          {
            id: 'bid-1',
            bidderId: 'buyer-1',
            bidAmount: new Prisma.Decimal(60000000),
            status: 'ACCEPTED',
          },
        ],
      })),
      update: mock.fn(async ({ data }) => {
        updatedAuctionStatus = data.status;
      }),
    },
    bid: {
      update: mock.fn(async ({ data }) => {
        updatedBidStatus = data.status;
      }),
    },
    $transaction: mock.fn(async (cb) => {
      return cb(prismaMock);
    }),
  };

  const gatewayMock = createMockGateway();
  const service = auctionFixture(prismaMock, gatewayMock);

  const result = await service.endAuction('auc-1', 'seller-1', 'SELLER');

  assert.equal(result.status, 'ENDED');
  assert.equal(result.winningBidderId, 'buyer-1');
  assert.equal(result.winningPrice, 60000000);
  assert.equal(updatedAuctionStatus, 'ENDED');
  assert.equal(updatedBidStatus, 'WINNING');
  assert.equal(gatewayMock.broadcastAuctionEnded.mock.callCount(), 1);
});

test('AuctionService.endAuction marks FAILED and unlocks deposit when reserve is not met', async () => {
  let walletRefunded = null;
  let refundTxCreated = null;
  let updatedBidStatus = null;
  let updatedAuctionStatus = null;

  const prismaMock = {
    auction: {
      findUnique: mock.fn(async () => ({
        id: 'auc-1',
        productId: 'product-1',
        sellerId: 'seller-1',
        status: 'ACTIVE',
        endTime: new Date(Date.now() - 1000),
        reservePrice: 80000000,
        bids: [
          {
            id: 'bid-1',
            bidderId: 'buyer-1',
            bidAmount: new Prisma.Decimal(60000000),
            status: 'ACCEPTED',
          },
        ],
      })),
      update: mock.fn(async ({ data }) => {
        updatedAuctionStatus = data.status;
      }),
    },
    wallet: {
      findUnique: mock.fn(async () => ({
        id: 'wal-buyer1',
        userId: 'buyer-1',
        balance: 10000000,
        lockedBalance: 60000000,
      })),
      update: mock.fn(async ({ data }) => {
        walletRefunded = data;
      }),
    },
    walletTransaction: {
      create: mock.fn(async ({ data }) => {
        refundTxCreated = data;
      }),
    },
    bid: {
      update: mock.fn(async ({ data }) => {
        updatedBidStatus = data.status;
      }),
    },
    $transaction: mock.fn(async (cb) => {
      return cb(prismaMock);
    }),
  };

  const gatewayMock = createMockGateway();
  const service = auctionFixture(prismaMock, gatewayMock);

  const result = await service.endAuction('auc-1', 'admin-1', 'ADMIN');

  assert.equal(result.status, 'FAILED');
  assert.equal(result.winningBidderId, null);
  assert.equal(updatedAuctionStatus, 'FAILED');
  assert.equal(updatedBidStatus, 'REJECTED');
  assert.deepEqual(walletRefunded, {
    lockedBalance: { decrement: new Prisma.Decimal(60000000) },
    balance: { increment: new Prisma.Decimal(60000000) },
  });
  assert.equal(refundTxCreated.type, 'AUCTION_BID_REFUND');
  assert.equal(Number(refundTxCreated.amount), 60000000);
});

test('AuctionService.endAuction rejects unauthorized callers and premature termination', async () => {
  const prismaMock = {
    auction: {
      findUnique: mock.fn(async () => ({
        id: 'auc-1',
        productId: 'product-1',
        sellerId: 'seller-1',
        status: 'ACTIVE',
        endTime: new Date(Date.now() + 600000),
        bids: [],
      })),
    },
  };

  const service = auctionFixture(prismaMock, createMockGateway());

  await assert.rejects(
    async () => {
      await service.endAuction('auc-1', 'seller-other', 'SELLER');
    },
    { message: /Bạn không có quyền kết thúc phiên/ },
  );

  await assert.rejects(
    async () => {
      await service.endAuction('auc-1', 'seller-1', 'SELLER');
    },
    { message: /Phiên đấu giá chưa kết thúc/ },
  );
});

test('AuctionService.adminStartAuction broadcasts synchronized intro payload with seller pricing and appraisal docs', async () => {
  const startTime = new Date(Date.now() + 600000);
  const endTime = new Date(Date.now() + 7200000);
  const issueDate = new Date('2026-04-15T00:00:00.000Z');
  const approvedLot = {
    id: 'lot-1',
    title: 'Nhẫn Kim Cương 2.1ct',
    description: 'Kiểm định GIA quốc tế',
    images: ['https://cdn.example.com/ring.jpg'],
    threeModelKey: 'preset_diamond_ring',
    lotNumber: 1,
    startingPrice: null,
    proposedStartingPrice: new Prisma.Decimal(125000000),
    reservePrice: null,
    proposedReservePrice: new Prisma.Decimal(160000000),
    bidIncrement: null,
    proposedBidIncrement: new Prisma.Decimal(2500000),
    appraisalCertificateNumber: 'GIA123',
    appraisalAgency: 'GIA',
    certificateImages: ['https://cdn.example.com/gia123.jpg'],
    certificateIssueDate: issueDate,
    seller: { id: 'seller-1', fullName: 'Huy Gems', avatarUrl: null, shopAvatarUrl: null },
  };

  const prismaMock = {
    auction: {
      findUnique: mock.fn(async () => ({
        id: 'auc-live-1',
        title: 'Phiên Đá Quý 2026',
        description: 'Mô tả phiên',
        status: 'SCHEDULED',
        startTime,
        endTime,
        items: [approvedLot],
      })),
      update: mock.fn(async ({ data }) => ({
        id: 'auc-live-1',
        title: 'Phiên Đá Quý 2026',
        description: 'Mô tả phiên',
        status: data.status,
        startTime: data.startTime,
        endTime: data.endTime,
        createdByAdmin: { id: 'admin-1', fullName: 'Admin', avatarUrl: null },
        seller: null,
        items: [approvedLot],
      })),
    },
  };

  const gatewayMock = createMockGateway();
  const service = auctionFixture(prismaMock, gatewayMock);

  const result = await service.adminStartAuction('auc-live-1');

  assert.equal(result.status, 'ACTIVE');
  assert.equal(result.introDurationMs, 3800 + 4800 + 3500);
  assert.equal(result.items[0].startingPrice, 125000000);
  assert.equal(result.items[0].bidIncrement, 2500000);
  assert.equal(result.items[0].appraisalCertificateNumber, 'GIA123');
  assert.equal(result.items[0].appraisalAgency, 'GIA');
  assert.deepEqual(result.items[0].certificateImages, ['https://cdn.example.com/gia123.jpg']);

  assert.equal(gatewayMock.broadcastAuctionStarted.mock.callCount(), 1);
  const wsPayload = gatewayMock.broadcastAuctionStarted.mock.calls[0].arguments[0];
  assert.equal(wsPayload.auctionId, 'auc-live-1');
  assert.equal(wsPayload.introDurationMs, 12100);
  assert.equal(wsPayload.items.length, 1);
  assert.equal(wsPayload.items[0].proposedStartingPrice, 125000000);
});

test('AuctionService.getAuctionIntroShowcase tracks live elapsedMs and reports false once intro concludes', async () => {
  const twoLots = [
    {
      id: 'lot-1',
      title: 'Lot 1',
      description: 'Desc 1',
      images: [],
      threeModelKey: null,
      lotNumber: 1,
      startingPrice: new Prisma.Decimal(1000000),
      proposedStartingPrice: new Prisma.Decimal(1000000),
      reservePrice: null,
      proposedReservePrice: null,
      bidIncrement: new Prisma.Decimal(50000),
      proposedBidIncrement: new Prisma.Decimal(50000),
      appraisalCertificateNumber: null,
      appraisalAgency: null,
      certificateImages: [],
      certificateIssueDate: null,
      seller: { id: 's1', fullName: 'Seller 1', avatarUrl: null, shopAvatarUrl: null },
    },
  ];

  // Started 4 seconds ago -> within 12100ms intro window
  const prismaLive = {
    auction: {
      findUnique: mock.fn(async () => ({
        id: 'auc-live-2',
        title: 'Live Sync Check',
        description: null,
        status: 'ACTIVE',
        startTime: new Date(Date.now() - 4000),
        endTime: new Date(Date.now() + 3600000),
        seller: null,
        product: null,
        items: twoLots,
      })),
    },
  };

  const liveService = auctionFixture(prismaLive, createMockGateway());
  const liveIntro = await liveService.getAuctionIntroShowcase('auc-live-2');
  assert.equal(liveIntro.isIntroActive, true);
  assert.ok(liveIntro.elapsedMs >= 3500 && liveIntro.elapsedMs < liveIntro.introDurationMs);

  // Started 60 seconds ago -> intro broadcast has finished
  const prismaEndedIntro = {
    auction: {
      findUnique: mock.fn(async () => ({
        id: 'auc-live-2',
        title: 'Live Sync Check',
        description: null,
        status: 'ACTIVE',
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(Date.now() + 3600000),
        seller: null,
        product: null,
        items: twoLots,
      })),
    },
  };

  const endedIntroService = auctionFixture(prismaEndedIntro, createMockGateway());
  const finishedIntro = await endedIntroService.getAuctionIntroShowcase('auc-live-2');
  assert.equal(finishedIntro.isIntroActive, false);
  assert.equal(finishedIntro.elapsedMs, finishedIntro.introDurationMs);
});
