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

function createMockGateway() {
  return {
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
        ...data,
      })),
    },
  };

  const gatewayMock = createMockGateway();
  const service = new AuctionService(prismaMock, gatewayMock);

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

  const service = new AuctionService(prismaMock, createMockGateway());

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

  const service = new AuctionService(prismaMock, createMockGateway());

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
            balance: 10000000, // Only 10m, needs 55m
            lockedBalance: 0,
          })),
        },
      };
      return cb(tx);
    }),
  };

  const service = new AuctionService(prismaMock, createMockGateway());

  await assert.rejects(
    async () => {
      await service.placeBid('auc-1', 'buyer-1', { bidAmount: 55000000 });
    },
    { message: /Số dư khả dụng trong ví NEXUS Pay không đủ/ },
  );
});

test('AuctionService.placeBid triggers anti-sniping extension when placed within last 2 minutes and manages wallet balance locks', async () => {
  const initialEndTime = new Date(Date.now() + 60000); // 1 minute left (<= 120s)

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
  const service = new AuctionService(prismaMock, gatewayMock);

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
        reservePrice: 50000000,
        bids: [
          {
            id: 'bid-1',
            bidderId: 'buyer-1',
            bidAmount: 60000000,
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
  const service = new AuctionService(prismaMock, gatewayMock);

  const result = await service.endAuction('auc-1');

  assert.equal(result.status, 'ENDED');
  assert.equal(result.winningBidderId, 'buyer-1');
  assert.equal(result.winningPrice, 60000000);
  assert.equal(updatedAuctionStatus, 'ENDED');
  assert.equal(updatedBidStatus, 'WINNING');
  assert.equal(gatewayMock.broadcastAuctionEnded.mock.callCount(), 1);
});
