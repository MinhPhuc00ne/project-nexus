import { describe, expect, it } from 'vitest';
import type { BuyerOrder } from '../../services/orders';
import { canBuyerReviewShop, getBuyerReviewEligibility } from '../buyerReviewEligibility';

const SHOP_ID = 'shop-1';
const CONFIRMED_STATUS: BuyerOrder['status'] = 'CONFIRMED';
const COMPLETED_ORDER_ID = 'completed-order';
const PRODUCT_ONE = 'product-1';
const PRODUCT_TWO = 'product-2';

function order(
  id: string,
  sellerId: string,
  status: BuyerOrder['status'],
  items: Array<{ productId: string; quantity: number }>,
): BuyerOrder {
  return {
    id,
    orderNumber: id,
    buyerId: 'buyer-1',
    sellerId,
    status,
    totalAmount: 0,
    subtotal: 0,
    shippingFee: 0,
    discountAmount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    items: items.map((item, index) => ({
      id: `${id}-item-${index}`,
      orderId: id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: 1,
      subtotal: item.quantity,
      product: { id: item.productId, title: item.productId },
    })),
  };
}

describe('Buyer review eligibility', () => {
  it('allows product reviews only for products in confirmed orders', () => {
    const orders = [
      order(COMPLETED_ORDER_ID, SHOP_ID, CONFIRMED_STATUS, [
        { productId: PRODUCT_ONE, quantity: 1 },
      ]),
      order('delivered-order', SHOP_ID, 'DELIVERED', [{ productId: PRODUCT_TWO, quantity: 1 }]),
    ];

    const eligibility = getBuyerReviewEligibility(orders, PRODUCT_ONE, SHOP_ID);
    expect(eligibility.productOrderId).toBe(COMPLETED_ORDER_ID);
    expect(eligibility.productOrderIds).toEqual([COMPLETED_ORDER_ID]);
    expect(eligibility.shopOrderIds).toEqual([COMPLETED_ORDER_ID]);
    expect(getBuyerReviewEligibility(orders, PRODUCT_TWO, SHOP_ID).productOrderId).toBeUndefined();
  });

  it('allows a shop review after at least two completed product units from that shop', () => {
    const oneUnit = [
      order('order-1', SHOP_ID, CONFIRMED_STATUS, [{ productId: PRODUCT_ONE, quantity: 1 }]),
    ];
    const twoUnits = [
      ...oneUnit,
      order('order-2', SHOP_ID, CONFIRMED_STATUS, [{ productId: PRODUCT_TWO, quantity: 1 }]),
    ];

    expect(canBuyerReviewShop(oneUnit, SHOP_ID)).toBe(false);
    expect(canBuyerReviewShop(twoUnits, SHOP_ID)).toBe(true);
    expect(canBuyerReviewShop(twoUnits, 'shop-2')).toBe(false);
  });
});
