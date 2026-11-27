import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { WishlistService } = load('../src/modules/users/services/wishlist.service.ts');

function createSampleProduct(id = 'prod-1') {
  return {
    id,
    title: 'Vintage Leather Jacket',
    basePrice: 500000,
    salePrice: 450000,
    saleStartsAt: new Date(Date.now() - 3600000),
    saleEndsAt: new Date(Date.now() + 3600000),
    images: [{ imageUrl: 'https://example.com/jacket.jpg', sortOrder: 0 }],
    category: { id: 'cat-1', name: 'Fashion' },
    seller: {
      id: 'seller-1',
      fullName: 'John Seller',
      avatarUrl: null,
      shopAvatarUrl: null,
      sellerUpgradeRequests: [{ storeName: 'Vintage Hub' }],
    },
    inventories: [{ availableQty: 5 }],
  };
}

test('WishlistService.getWishlist returns properly mapped DTOs with effective prices and stock', async () => {
  const sampleProduct = createSampleProduct();
  const sampleWishlistItem = {
    id: 'wish-1',
    userId: 'user-1',
    productId: 'prod-1',
    createdAt: new Date('2026-11-20T10:00:00Z'),
    product: sampleProduct,
  };

  const prisma = {
    wishlistItem: {
      findMany: mock.fn(async () => [sampleWishlistItem]),
    },
  };

  const service = new WishlistService(prisma);
  const result = await service.getWishlist('user-1');

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'prod-1');
  assert.equal(result[0].name, 'Vintage Leather Jacket');
  assert.equal(result[0].price, 450000);
  assert.equal(result[0].originalPrice, 500000);
  assert.equal(result[0].shopName, 'Vintage Hub');
  assert.equal(result[0].inStock, true);
  assert.equal(result[0].category, 'Fashion');
  assert.equal(result[0].img, 'https://example.com/jacket.jpg');
});

test('WishlistService.getWishlistIds returns array of product ids', async () => {
  const prisma = {
    wishlistItem: {
      findMany: mock.fn(async () => [{ productId: 'p1' }, { productId: 'p2' }]),
    },
  };

  const service = new WishlistService(prisma);
  const ids = await service.getWishlistIds('user-1');

  assert.deepEqual(ids, ['p1', 'p2']);
});

test('WishlistService.addToWishlist checks product existence and upserts item', async () => {
  const sampleProduct = createSampleProduct();
  const sampleWishlistItem = {
    id: 'wish-new',
    userId: 'user-1',
    productId: 'prod-1',
    createdAt: new Date('2026-11-23T12:00:00Z'),
    product: sampleProduct,
  };

  const prisma = {
    product: {
      findFirst: mock.fn(async ({ where }) =>
        where.id === 'prod-1' && where.status === 'ACTIVE' ? { id: 'prod-1' } : null,
      ),
    },
    wishlistItem: {
      upsert: mock.fn(async () => sampleWishlistItem),
    },
  };

  const service = new WishlistService(prisma);

  // Success
  const item = await service.addToWishlist('user-1', 'prod-1');
  assert.equal(item.id, 'prod-1');
  assert.equal(item.shopName, 'Vintage Hub');

  // Not found product
  await assert.rejects(
    async () => service.addToWishlist('user-1', 'non-existent'),
    /Product not found or unavailable/,
  );
});

test('WishlistService.removeFromWishlist deletes item from database', async () => {
  let deletedArgs = null;
  const prisma = {
    wishlistItem: {
      deleteMany: mock.fn(async (args) => {
        deletedArgs = args;
        return { count: 1 };
      }),
    },
  };

  const service = new WishlistService(prisma);
  const res = await service.removeFromWishlist('user-1', 'prod-1');

  assert.equal(res.success, true);
  assert.deepEqual(deletedArgs, { where: { userId: 'user-1', productId: 'prod-1' } });
});

test('WishlistService.syncGuestWishlist filters valid products and creates items with skipDuplicates', async () => {
  const sampleProduct = createSampleProduct('prod-1');
  let createManyData = null;

  const prisma = {
    product: {
      findMany: mock.fn(async ({ where }) => {
        const requested = where.id.in;
        return requested.filter((id) => id === 'prod-1').map((id) => ({ id }));
      }),
    },
    wishlistItem: {
      createMany: mock.fn(async (args) => {
        createManyData = args;
        return { count: 1 };
      }),
      findMany: mock.fn(async () => [
        {
          id: 'wish-1',
          userId: 'user-1',
          productId: 'prod-1',
          createdAt: new Date(),
          product: sampleProduct,
        },
      ]),
    },
  };

  const service = new WishlistService(prisma);
  const result = await service.syncGuestWishlist('user-1', ['prod-1', 'invalid-prod', 'prod-1']);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'prod-1');
  assert.deepEqual(createManyData, {
    data: [{ userId: 'user-1', productId: 'prod-1' }],
    skipDuplicates: true,
  });
});
