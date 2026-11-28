import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { BadRequestException, ForbiddenException } = load('@nestjs/common');
const { WithdrawalService } = load('../src/modules/wallet/services/withdrawal.service.ts');
const { SellerFinanceService } = load('../src/modules/wallet/services/seller-finance.service.ts');
const { AdminService } = load('../src/modules/admin/services/admin.service.ts');
const { AdminFinanceService } = load('../src/modules/admin/services/admin-finance.service.ts');
const { ReviewWithdrawalSchema } = load('../src/modules/admin/dtos/review-withdrawal.dto.ts');

function createWithdrawalPrismaMock(overrides = {}) {
  const notifications = [];
  const adminNotifications = [];
  const userUpdates = [];
  const walletUpdates = [];
  const createdRequests = [];
  const createdTransactions = [];

  const user = overrides.user ?? {
    id: 'buyer-1',
    role: 'BUYER',
    fullName: 'Nguyen Van Buyer',
    isShopSuspended: false,
    suspensionReason: null,
    bankName: 'Vietcombank',
    accountNumber: '123456789',
    accountHolderName: 'NGUYEN VAN BUYER',
    wallet: {
      id: 'wallet-1',
      userId: 'buyer-1',
      balance: 500000,
      lockedBalance: 0,
      currency: 'VND',
    },
    sellerUpgradeRequests: [],
  };

  const txClient = {
    // The service locks the wallet row before counting pending requests.
    $queryRaw: async () => [],
    user: {
      update: async (args) => {
        userUpdates.push(args);
        return { ...user, ...args.data };
      },
      findMany: async () => [{ id: 'admin-1' }, { id: 'admin-2' }],
    },
    wallet: {
      updateMany: async (args) => {
        walletUpdates.push(args);
        if (overrides.debitCount !== undefined) {
          return { count: overrides.debitCount };
        }
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({
        id: user.wallet.id,
        balance: Number(user.wallet.balance) - (overrides.amount ?? 100000),
        lockedBalance: Number(user.wallet.lockedBalance) + (overrides.amount ?? 100000),
        currency: 'VND',
      }),
    },
    withdrawalRequest: {
      count: async () => overrides.pendingCount ?? 0,
      create: async ({ data }) => {
        const req = {
          id: 'req-1',
          ...data,
          createdAt: new Date('2026-11-23T10:00:00Z'),
        };
        createdRequests.push(req);
        return req;
      },
    },
    walletTransaction: {
      create: async ({ data }) => {
        const tx = { id: 'wtx-1', ...data };
        createdTransactions.push(tx);
        return tx;
      },
    },
    notification: {
      create: async ({ data }) => {
        notifications.push(data);
        return data;
      },
      createMany: async ({ data }) => {
        adminNotifications.push(...data);
        return { count: data.length };
      },
    },
  };

  const prisma = {
    user: {
      findUnique: async () => user,
    },
    wallet: {
      create: async ({ data }) => ({ id: 'wallet-created', ...data }),
    },
    withdrawalRequest: {
      count: async () => overrides.pendingCount ?? 0,
    },
    // The service locks the wallet row before counting pending requests.
    $transaction: async (run) => run(txClient),
  };

  return {
    prisma,
    notifications,
    adminNotifications,
    userUpdates,
    walletUpdates,
    createdRequests,
    createdTransactions,
  };
}

test('Buyer can create withdrawal using profile bank info, freezes balance, and notifies admins', async () => {
  const mock = createWithdrawalPrismaMock({ amount: 200000 });
  const service = new WithdrawalService(mock.prisma);

  const result = await service.createWithdrawal('buyer-1', { amount: 200000 });

  assert.equal(result.success, true);
  assert.equal(result.withdrawalRequest.amount, 200000);
  assert.equal(result.withdrawalRequest.bankName, 'Vietcombank');
  assert.equal(result.withdrawalRequest.status, 'PENDING');
  assert.equal(result.wallet.balance, 300000);
  assert.equal(result.wallet.lockedBalance, 200000);

  assert.equal(mock.userUpdates.length, 0);
  assert.equal(mock.walletUpdates[0].where.balance.gte, 200000);
  assert.equal(mock.createdTransactions[0].type, 'WITHDRAW');
  assert.equal(mock.createdTransactions[0].status, 'PENDING');
  assert.equal(mock.notifications.length, 1);
  assert.equal(mock.notifications[0].userId, 'buyer-1');
  assert.equal(mock.adminNotifications.length, 2);
  assert.equal(mock.adminNotifications[0].title, 'New Buyer withdrawal request');
  assert.equal(mock.adminNotifications[0].targetUrl, '/admin/finance');
});

test('Buyer without bank info in profile must provide bank details, which are then saved to profile', async () => {
  const userWithoutBank = {
    id: 'buyer-2',
    role: 'BUYER',
    fullName: 'Tran Thi B',
    isShopSuspended: false,
    suspensionReason: null,
    bankName: null,
    accountNumber: null,
    accountHolderName: null,
    wallet: {
      id: 'wallet-2',
      userId: 'buyer-2',
      balance: 300000,
      lockedBalance: 0,
      currency: 'VND',
    },
    sellerUpgradeRequests: [],
  };

  const mockMissing = createWithdrawalPrismaMock({ user: userWithoutBank });
  const serviceMissing = new WithdrawalService(mockMissing.prisma);

  await assert.rejects(
    () => serviceMissing.createWithdrawal('buyer-2', { amount: 100000 }),
    (err) => err instanceof BadRequestException,
  );

  const mockProvided = createWithdrawalPrismaMock({ user: userWithoutBank, amount: 100000 });
  const serviceProvided = new WithdrawalService(mockProvided.prisma);
  const res = await serviceProvided.createWithdrawal('buyer-2', {
    amount: 100000,
    bankName: 'MB Bank',
    accountNumber: '999888777',
    accountHolderName: 'tran thi b',
  });

  assert.equal(res.withdrawalRequest.accountHolderName, 'TRAN THI B');
  assert.equal(mockProvided.userUpdates.length, 1);
  assert.deepEqual(mockProvided.userUpdates[0].data, {
    bankName: 'MB Bank',
    accountNumber: '999888777',
    accountHolderName: 'TRAN THI B',
  });
});

test('Withdrawal rejects insufficient balance, >3 pending requests, and concurrent debit race', async () => {
  const lowBalanceMock = createWithdrawalPrismaMock();
  const service1 = new WithdrawalService(lowBalanceMock.prisma);
  await assert.rejects(
    () => service1.createWithdrawal('buyer-1', { amount: 600000 }),
    (err) => err instanceof BadRequestException,
  );

  const limitMock = createWithdrawalPrismaMock({ pendingCount: 3 });
  const service2 = new WithdrawalService(limitMock.prisma);
  await assert.rejects(
    () => service2.createWithdrawal('buyer-1', { amount: 100000 }),
    (err) => err instanceof BadRequestException,
  );

  const raceMock = createWithdrawalPrismaMock({ debitCount: 0 });
  const service3 = new WithdrawalService(raceMock.prisma);
  await assert.rejects(
    () => service3.createWithdrawal('buyer-1', { amount: 100000 }),
    (err) => err instanceof BadRequestException,
  );
});

test('SellerFinanceService.createWithdrawal enforces SELLER/ADMIN role and suspended shop check', async () => {
  const buyerMock = createWithdrawalPrismaMock();
  const withdrawalService = new WithdrawalService(buyerMock.prisma);
  const sellerFinance = new SellerFinanceService(buyerMock.prisma, {}, withdrawalService);

  await assert.rejects(
    () => sellerFinance.createWithdrawal('buyer-1', { amount: 100000 }),
    (err) => err instanceof ForbiddenException,
  );
});

test('AdminService.reviewWithdrawalRequest handles COMPLETED approval and REJECTED refund with notifications', async () => {
  const notifications = [];
  const walletUpdates = [];
  const txUpdates = [];
  const reqUpdates = [];

  const createAdminPrisma = (status = 'PENDING') => ({
    withdrawalRequest: {
      findUnique: async () => ({
        id: 'req-1',
        userId: 'buyer-1',
        amount: 150000,
        bankName: 'Vietcombank',
        accountNumber: '123456789',
        accountHolderName: 'NGUYEN VAN BUYER',
        status,
        user: {
          id: 'buyer-1',
          wallet: { id: 'wallet-1', balance: 350000, lockedBalance: 150000 },
        },
      }),
    },
    $transaction: async (run) =>
      run({
        wallet: {
          update: async (args) => walletUpdates.push(args),
        },
        walletTransaction: {
          updateMany: async (args) => txUpdates.push(args),
        },
        withdrawalRequest: {
          update: async (args) => reqUpdates.push(args),
        },
        notification: {
          create: async ({ data }) => notifications.push(data),
        },
      }),
  });

  const adminService = new AdminService(createAdminPrisma());

  // PENDING is not a review outcome, and the schema is what says so now: the
  // service used to re-check it, which TypeScript can prove unreachable once
  // the body's type comes from the schema.
  assert.equal(ReviewWithdrawalSchema.safeParse({ status: 'PENDING' }).success, false);

  await assert.rejects(
    () =>
      adminService.reviewWithdrawalRequest('req-1', 'admin-1', {
        status: 'REJECTED',
        rejectionReason: '   ',
      }),
    (err) => err instanceof BadRequestException,
  );

  await adminService.reviewWithdrawalRequest('req-1', 'admin-1', {
    status: 'REJECTED',
    rejectionReason: 'Sai số tài khoản',
  });

  assert.equal(walletUpdates[0].data.lockedBalance.decrement, 150000);
  assert.equal(walletUpdates[0].data.balance.increment, 150000);
  assert.equal(txUpdates[0].data.status, 'FAILED');
  assert.match(notifications[0].content, /Sai số tài khoản/);

  await adminService.reviewWithdrawalRequest('req-1', 'admin-1', {
    status: 'COMPLETED',
    adminNote: 'Đã chuyển khoản',
  });

  assert.equal(walletUpdates[1].data.lockedBalance.decrement, 150000);
  assert.equal(walletUpdates[1].data.balance, undefined);
  assert.equal(txUpdates[1].data.status, 'SUCCESS');
  assert.equal(notifications[1].userId, 'buyer-1');
  assert.match(notifications[1].title, /approved successfully/);
});

test('AdminFinanceService.getPlatformUserWalletTransactions filters deposits and user roles with pagination', async () => {
  const capturedQueries = [];
  const prismaMock = {
    walletTransaction: {
      count: async ({ where }) => {
        capturedQueries.push({ op: 'count', where });
        return 1;
      },
      findMany: async (args) => {
        capturedQueries.push({ op: 'findMany', args });
        return [
          {
            id: 'tx-deposit-1',
            walletId: 'wallet-buyer-1',
            amount: 500000,
            type: 'DEPOSIT',
            status: 'SUCCESS',
            referenceId: 'PAYOS-12345',
            description: 'Nạp tiền vào ví qua PayOS',
            createdAt: new Date('2026-11-23T09:00:00Z'),
            wallet: {
              id: 'wallet-buyer-1',
              balance: 500000,
              lockedBalance: 0,
              currency: 'VND',
              user: {
                id: 'buyer-1',
                fullName: 'Nguyen Van Buyer',
                email: 'buyer@nexus.com',
                phoneNumber: '0901234567',
                role: 'BUYER',
              },
            },
          },
        ];
      },
    },
  };

  const adminFinance = new AdminFinanceService(prismaMock);
  const result = await adminFinance.getPlatformUserWalletTransactions({
    page: 1,
    limit: 20,
    type: 'DEPOSIT',
    status: 'SUCCESS',
    role: 'BUYER',
    search: 'buyer@nexus.com',
  });

  assert.equal(result.total, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].type, 'DEPOSIT');
  assert.equal(result.items[0].amount, 500000);
  assert.equal(result.items[0].user.role, 'BUYER');
  assert.equal(result.items[0].user.email, 'buyer@nexus.com');
  assert.equal(result.items[0].user.walletBalance, 500000);

  const findWhere = capturedQueries[1].args.where;
  assert.equal(findWhere.type, 'DEPOSIT');
  assert.equal(findWhere.status, 'SUCCESS');
  assert.deepEqual(findWhere.wallet, { user: { role: 'BUYER' } });
  assert.equal(findWhere.OR.length, 4);
});
