import type { BuyerOrder } from '../services/orders';

export interface BuyerReviewEligibility {
  productOrderId?: string;
  productOrderIds: string[];
  shopOrderIds: string[];
  canReviewShop: boolean;
}

export function getBuyerReviewEligibility(
  orders: BuyerOrder[],
  productId: string,
  sellerId?: string,
): BuyerReviewEligibility {
  const completedOrders = orders.filter((order) => order.status === 'CONFIRMED');
  const productOrders = completedOrders.filter((order) =>
    order.items.some((item) => item.productId === productId || item.product?.id === productId),
  );
  const shopOrders = sellerId ? completedOrders.filter((order) => order.sellerId === sellerId) : [];
  const purchasedQuantity = shopOrders.reduce(
    (total, order) =>
      total + order.items.reduce((orderTotal, item) => orderTotal + item.quantity, 0),
    0,
  );

  return {
    productOrderId: productOrders[0]?.id,
    productOrderIds: productOrders.map((order) => order.id),
    shopOrderIds: shopOrders.map((order) => order.id),
    canReviewShop: purchasedQuantity >= 2,
  };
}

export function canBuyerReviewShop(orders: BuyerOrder[], sellerId: string): boolean {
  const purchasedQuantity = orders
    .filter((order) => order.status === 'CONFIRMED' && order.sellerId === sellerId)
    .reduce(
      (total, order) =>
        total + order.items.reduce((orderTotal, item) => orderTotal + item.quantity, 0),
      0,
    );
  return purchasedQuantity >= 2;
}
