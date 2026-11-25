import { describe, expect, it, vi } from 'vitest';
import { updateAdminProductCategory } from '../adminCommerce';
import { adminRequest } from '../adminRequest';

vi.mock('../adminRequest', () => ({
  adminRequest: vi.fn(),
}));

describe('adminCommerce category assignment', () => {
  it('calls the backend PATCH endpoint with encoded product ID and payload', async () => {
    vi.mocked(adminRequest).mockResolvedValue({ success: true });

    const dto = { categoryId: 'cat-2', reason: 'Reclassified' };
    await updateAdminProductCategory('product/1', dto);

    expect(adminRequest).toHaveBeenCalledWith({
      url: '/admin/products/product%2F1/category',
      method: 'PATCH',
      data: dto,
    });
  });
});
