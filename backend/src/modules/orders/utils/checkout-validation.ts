import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { effectivePrice } from '../../../core/domain/product-price';
import { validateSelections } from '../../../core/domain/product-options';

export interface QuotedCartItem {
  id: string;
  productId: string;
  quantity: number;
  sellerId: string;
  price: number;
  optionKey: string;
}

export async function validateQuotedCheckout(
  tx: Prisma.TransactionClient,
  cartId: string,
  expected: QuotedCartItem[],
  pricedAt: Date,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM carts WHERE id = ${cartId} FOR UPDATE`;
  const sellers = [...new Set(expected.map((item) => item.sellerId))].sort();
  await tx.$queryRaw`SELECT id FROM users WHERE id IN (${Prisma.join(sellers)}) ORDER BY id FOR SHARE`;
  const current = await tx.cartItem.findMany({
    where: { cartId, id: { in: expected.map((item) => item.id) } },
    include: {
      product: {
        include: {
          options: true,
          inventories: true,
          seller: { select: { isShopSuspended: true, trustLevel: true } },
        },
      },
    },
  });
  if (current.length !== expected.length)
    throw new BadRequestException('Giỏ hàng đã thay đổi. Vui lòng lấy lại báo giá.');
  const quantities = new Map<string, number>();
  for (const original of expected) {
    const item = current.find((row) => row.id === original.id);
    if (
      !item ||
      item.productId !== original.productId ||
      item.quantity !== original.quantity ||
      item.product.sellerId !== original.sellerId ||
      item.optionKey !== original.optionKey ||
      effectivePrice(item.product, pricedAt) !== original.price ||
      item.product.status !== 'ACTIVE' ||
      item.product.seller.isShopSuspended ||
      item.product.seller.trustLevel === 'SUSPENDED'
    ) {
      throw new BadRequestException(
        'Sản phẩm, giá hoặc trạng thái shop đã thay đổi. Vui lòng lấy lại báo giá.',
      );
    }
    validateSelections(item.product.options, item.selections);
    const count = (quantities.get(item.productId) ?? 0) + item.quantity;
    quantities.set(item.productId, count);
    if (count > item.product.inventories.reduce((sum, inv) => sum + inv.availableQty, 0)) {
      throw new BadRequestException('Tổng màu/size đã chọn vượt tồn kho sản phẩm.');
    }
  }
}
