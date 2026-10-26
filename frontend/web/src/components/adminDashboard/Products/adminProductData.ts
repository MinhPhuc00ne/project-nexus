import type { AdminProductStatus } from '../../../types/admin-product.types';

export const adminProductLabels: Record<AdminProductStatus, string> = {
  ACTIVE: 'Đang bán',
  INACTIVE: 'Đã ẩn',
  DRAFT: 'Bản nháp',
};
