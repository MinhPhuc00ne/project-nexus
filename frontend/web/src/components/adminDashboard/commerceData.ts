import type { AdminCommerceData, CommerceChange } from './commerceTypes';

// Một điểm cập nhật cho các page: chuyển trang vẫn giữ trạng thái trong phiên admin.
export function applyCommerceChange<T extends AdminCommerceData>(
  data: T,
  change: CommerceChange,
): T {
  switch (change.entity) {
    case 'products':
      return {
        ...data,
        products: data.products.map((item) => {
          if (item.id !== change.id) return item;
          const allowed =
            (item.status === 'pending' && ['active', 'rejected'].includes(change.status)) ||
            (item.status === 'active' && change.status === 'hidden') ||
            (item.status === 'hidden' && change.status === 'active');
          return allowed ? { ...item, status: change.status, note: change.reason } : item;
        }),
      };
    case 'orders':
      return {
        ...data,
        orders: data.orders.map((item) =>
          item.id === change.id && ['pending', 'confirmed'].includes(item.status)
            ? { ...item, status: change.status, note: change.reason }
            : item,
        ),
      };
    case 'stores':
      return {
        ...data,
        stores: data.stores.map((item) =>
          item.id === change.id ? { ...item, status: change.status, note: change.reason } : item,
        ),
      };
    case 'reports':
      return {
        ...data,
        reports: data.reports.map((item) =>
          item.id === change.id && ['open', 'investigating'].includes(item.status)
            ? { ...item, status: change.status, note: change.reason }
            : item,
        ),
      };
    case 'transactions':
      return {
        ...data,
        transactions: data.transactions.map((item) =>
          item.id === change.id && item.status === 'pending'
            ? { ...item, status: change.status, note: change.reason }
            : item,
        ),
      };
  }
}
