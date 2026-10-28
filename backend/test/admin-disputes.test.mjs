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
const { AdminDisputesService } = load('../src/modules/admin/services/admin-disputes.service.ts');

test('AdminDisputesService.getDisputes returns list of disputes, counters and pagination', async () => {
  const disputesList = [
    {
      id: 'disp-1',
      orderId: 'order-1',
      reason: 'Hàng không đúng mô tả',
      evidenceUrls: ['http://img1.jpg'],
      status: 'OPEN',
      resolutionNotes: null,
      resolvedAt: null,
      createdAt: new Date('2026-10-28T09:00:00Z'),
      openedBy: {
        id: 'buyer-1',
        fullName: 'Nguyễn Văn A',
        email: 'buyer@test.com',
        phoneNumber: '0901234567',
        avatarUrl: null,
      },
      resolvedBy: null,
      order: {
        id: 'order-1',
        subtotal: 100000,
        shippingFee: 30000,
        totalAmount: 130000,
        status: 'DELIVERED',
        createdAt: new Date('2026-10-27T09:00:00Z'),
        buyer: {
          id: 'buyer-1',
          fullName: 'Nguyễn Văn A',
          email: 'buyer@test.com',
          phoneNumber: '0901234567',
        },
        seller: {
          id: 'seller-1',
          fullName: 'Shop Hoàng Gia',
          email: 'seller@test.com',
          phoneNumber: '0987654321',
          avatarUrl: null,
          shopAvatarUrl: null,
        },
        escrowRecord: {
          id: 'escrow-1',
          totalAmount: 130000,
          platformFee: 7000,
          sellerPayout: 93000,
          status: 'DISPUTED',
        },
        items: [
          {
            id: 'item-1',
            quantity: 1,
            unitPrice: 100000,
            totalPrice: 100000,
            product: {
              id: 'prod-1',
              title: 'Đồng hồ cổ',
              images: [{ imageUrl: 'http://thumb.jpg' }],
            },
          },
        ],
      },
    },
    {
      id: 'disp-2',
      orderId: 'order-2',
      reason: 'Bể vỡ khi vận chuyển',
      evidenceUrls: [],
      status: 'UNDER_REVIEW',
      resolutionNotes: null,
      resolvedAt: null,
      createdAt: new Date('2026-10-28T09:30:00Z'),
      openedBy: {
        id: 'buyer-2',
        fullName: 'Trần Thị B',
        email: 'buyer2@test.com',
        phoneNumber: '0912345678',
        avatarUrl: null,
      },
      resolvedBy: null,
      order: {
        id: 'order-2',
        subtotal: 200000,
        shippingFee: 30000,
        totalAmount: 230000,
        status: 'DELIVERED',
        createdAt: new Date('2026-10-27T10:00:00Z'),
        buyer: {
          id: 'buyer-2',
          fullName: 'Trần Thị B',
          email: 'buyer2@test.com',
          phoneNumber: '0912345678',
        },
        seller: {
          id: 'seller-2',
          fullName: 'Gốm Sứ Bát Tràng',
          email: 'seller2@test.com',
          phoneNumber: '0977665544',
          avatarUrl: null,
          shopAvatarUrl: null,
        },
        escrowRecord: {
          id: 'escrow-2',
          totalAmount: 230000,
          platformFee: 14000,
          sellerPayout: 186000,
          status: 'DISPUTED',
        },
        items: [
          {
            id: 'item-2',
            quantity: 1,
            unitPrice: 200000,
            totalPrice: 200000,
            product: { id: 'prod-2', title: 'Bình hoa gốm', images: [] },
          },
        ],
      },
    },
  ];

  const prisma = {
    dispute: {
      findMany: mock.fn(async (args) => {
        if (args?.select?.status) {
          // allDisputes query for counters
          return [
            { status: 'OPEN' },
            { status: 'UNDER_REVIEW' },
            { status: 'RESOLVED_BUYER_FAVOR' },
          ];
        }
        return disputesList;
      }),
      count: mock.fn(async () => 2),
    },
  };

  const service = new AdminDisputesService(prisma);
  const result = await service.getDisputes({ page: 1, limit: 10 });

  assert.equal(result.items.length, 2);
  assert.equal(result.total, 2);
  assert.equal(result.page, 1);
  assert.equal(result.limit, 10);
  assert.equal(result.counters.all, 3);
  assert.equal(result.counters.pendingReview, 2); // 1 OPEN + 1 UNDER_REVIEW
  assert.equal(result.counters.open, 1);
  assert.equal(result.counters.underReview, 1);
  assert.equal(result.counters.resolvedBuyerFavor, 1);
  assert.equal(result.counters.resolvedSellerFavor, 0);

  // Check item data
  const first = result.items[0];
  assert.equal(first.id, 'disp-1');
  assert.equal(first.openedBy.fullName, 'Nguyễn Văn A');
  assert.equal(first.order.totalAmount, 130000);
  assert.equal(first.order.items[0].title, 'Đồng hồ cổ');
  assert.equal(first.order.items[0].thumbnail, 'http://thumb.jpg');
});
