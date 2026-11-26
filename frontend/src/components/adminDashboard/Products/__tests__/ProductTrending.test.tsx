import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import {
  listAdminProducts,
  listAdminTrendingProducts,
  getCategoryTree,
  removeAdminProductFromTrending,
} from '@/features/admin/services/admin';
import type { AdminProduct } from '../../../../types/admin-product.types';
import type { AdminData } from '../../shared/adminTypes';
import { ToastProvider } from '../../../ToastNotification';
import ProductManagement from '../ProductManagement';

const trendingAria = 'Quản lý tag Xu hướng của sản phẩm Product trending';
const trendingTitle = 'Product trending';
const normalTitle = 'Product normal';
const trendingFilterLabel = 'Lọc trạng thái sản phẩm';

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'admin-token' }) }));
vi.mock('@/features/auth/services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/services/auth')>()),
  getStoredToken: () => 'admin-token',
}));
vi.mock('@/features/admin/services/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/admin/services/admin')>()),
  listAdminProducts: vi.fn(),
  listAdminTrendingProducts: vi.fn(),
  getCategoryTree: vi.fn(),
  removeAdminProductFromTrending: vi.fn(),
}));

function product(id: string): AdminProduct {
  return {
    id,
    title: `Product ${id}`,
    description: '',
    basePrice: 100000,
    status: 'ACTIVE',
    threeModelKey: null,
    weightGrams: 500,
    category: { id: 'category-1', name: 'Category', slug: 'category', level: 1 },
    seller: {
      id: 'seller-1',
      fullName: 'Seller',
      email: 'seller@example.com',
      phoneNumber: null,
      avatarUrl: null,
      isSellerActive: true,
    },
    thumbnailUrl: null,
    imagesCount: 0,
    stock: { availableQty: 10, totalQty: 10 },
    createdAt: '2026-11-23T00:00:00Z',
    updatedAt: '2026-11-23T00:00:00Z',
  };
}

function renderProducts() {
  render(
    <ToastProvider>
      <ProductManagement
        data={{} as AdminData}
        actions={{
          navigate: vi.fn(),
          notify: vi.fn(),
          showDetail: vi.fn(),
          updateCommerce: vi.fn(),
        }}
      />
    </ToastProvider>,
  );
}

async function openTrendingDialog() {
  renderProducts();
  fireEvent.click(
    await screen.findByRole('button', {
      name: trendingAria,
    }),
  );
  return screen.getByRole('dialog', { name: 'Quản lý tag Xu hướng' });
}

describe('admin product Trending moderation', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await i18n.changeLanguage('vi');
    vi.mocked(listAdminProducts).mockResolvedValue({
      items: [product('trending'), product('normal')],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    vi.mocked(getCategoryTree).mockResolvedValue([]);
    vi.mocked(listAdminTrendingProducts).mockResolvedValue({
      items: [
        {
          id: 'trending',
          title: trendingTitle,
          purchaseCount: 42,
          lastPurchaseAt: null,
          isTrending: true,
        },
      ],
      total: 1,
    });
  });

  it('filters trending products and restores all products', async () => {
    renderProducts();
    await screen.findByText(normalTitle);
    fireEvent.change(screen.getByLabelText(trendingFilterLabel), {
      target: { value: 'trending' },
    });
    expect(await screen.findByText(trendingTitle)).toBeInTheDocument();
    expect(screen.queryByText(normalTitle)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(trendingFilterLabel), {
      target: { value: '' },
    });
    expect(await screen.findByText(trendingTitle)).toBeInTheDocument();
    expect(screen.getByText(normalTitle)).toBeInTheDocument();
  });

  it('finds trending products beyond the current server page and clears the previous selling status', async () => {
    vi.mocked(listAdminProducts).mockImplementation(async (query) => ({
      items: query.limit === 100 && query.page === 2 ? [product('trending')] : [product('normal')],
      total: 101,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      totalPages: query.limit === 100 ? 2 : 11,
    }));
    renderProducts();
    await screen.findByText(normalTitle);
    fireEvent.change(screen.getByLabelText(i18n.t('products.statusAria', { ns: 'admin' })), {
      target: { value: 'ACTIVE' },
    });
    fireEvent.change(screen.getByLabelText(trendingFilterLabel), {
      target: { value: 'trending' },
    });
    expect(await screen.findByText(trendingTitle)).toBeInTheDocument();
    expect(screen.queryByText(normalTitle)).not.toBeInTheDocument();
    expect(listAdminProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 100, status: undefined }),
      expect.any(AbortSignal),
    );
    expect(
      screen.getByRole('button', { name: i18n.t('products.next', { ns: 'admin' }) }),
    ).toBeDisabled();
  });

  it('switches from trending back to a selling status using the same dropdown', async () => {
    renderProducts();
    await screen.findByText(normalTitle);
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText(trendingFilterLabel), { target: { value: 'trending' } });
    await screen.findByText(trendingTitle);
    fireEvent.change(screen.getByLabelText(trendingFilterLabel), { target: { value: 'INACTIVE' } });
    expect(await screen.findByText(normalTitle)).toBeInTheDocument();
    expect(screen.getByLabelText(trendingFilterLabel)).toHaveValue('INACTIVE');
    expect(listAdminProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, limit: 10, status: 'INACTIVE' }),
      expect.any(AbortSignal),
    );
  });

  it('shows an empty trending list when the Top 10 is empty', async () => {
    vi.mocked(listAdminTrendingProducts).mockResolvedValue({ items: [], total: 0 });
    renderProducts();
    await screen.findByText(normalTitle);
    fireEvent.change(screen.getByLabelText(trendingFilterLabel), {
      target: { value: 'trending' },
    });
    expect(await screen.findByText(i18n.t('products.empty', { ns: 'admin' }))).toBeInTheDocument();
    expect(screen.queryByText(normalTitle)).not.toBeInTheDocument();
  });

  it('does not misclassify products when the trending request fails', async () => {
    vi.mocked(listAdminTrendingProducts).mockRejectedValue(new Error('Trending unavailable'));
    renderProducts();
    await screen.findByText(normalTitle);
    fireEvent.change(screen.getByLabelText(trendingFilterLabel), {
      target: { value: 'trending' },
    });
    expect(await screen.findByText('Trending unavailable')).toBeInTheDocument();
    expect(screen.queryByText(normalTitle)).not.toBeInTheDocument();
  });

  it('shows the tag only for trending products, sends the reason, and refreshes tags after removal', async () => {
    const dialog = await openTrendingDialog();
    expect(
      screen.queryByRole('button', { name: 'Quản lý tag Xu hướng của sản phẩm Product normal' }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText('Đã bán 42 sản phẩm')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Lý do gỡ tag (không bắt buộc)'), {
      target: { value: 'Không đạt chuẩn' },
    });
    vi.mocked(removeAdminProductFromTrending).mockResolvedValue({
      success: true,
      message: 'Removed',
      product: { id: 'trending', title: trendingTitle, trendingExcluded: true },
    });
    vi.mocked(listAdminTrendingProducts).mockResolvedValue({ items: [], total: 0 });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gỡ tag Xu hướng' }));
    await waitFor(() =>
      expect(removeAdminProductFromTrending).toHaveBeenCalledWith('trending', 'Không đạt chuẩn'),
    );
    expect(
      await screen.findByText('Đã gỡ sản phẩm “Product trending” khỏi Xu hướng.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: trendingAria })).not.toBeInTheDocument();
    expect(listAdminTrendingProducts).toHaveBeenCalledTimes(2);
  });

  it('keeps the dialog, reason and tag when removal fails', async () => {
    const dialog = await openTrendingDialog();
    const reason = within(dialog).getByLabelText('Lý do gỡ tag (không bắt buộc)');
    fireEvent.change(reason, { target: { value: 'Chất lượng kém' } });
    vi.mocked(removeAdminProductFromTrending).mockRejectedValue(new Error('Request failed'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gỡ tag Xu hướng' }));
    await waitFor(() =>
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Request failed'),
    );
    expect(reason).toHaveValue('Chất lượng kém');
    expect(screen.getByRole('button', { name: trendingAria })).toBeInTheDocument();
    expect(listAdminTrendingProducts).toHaveBeenCalledTimes(1);
  });

  it('retains product management and offers retry when Trending cannot be loaded', async () => {
    vi.mocked(listAdminTrendingProducts).mockRejectedValue(new Error('Unavailable'));
    renderProducts();
    expect(await screen.findByText(normalTitle)).toBeInTheDocument();
    expect(
      await screen.findByText('Chưa kiểm tra được tag Xu hướng. Bấm Thử lại để cập nhật.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Quản lý tag Xu hướng của sản phẩm/ }),
    ).not.toBeInTheDocument();
    vi.mocked(listAdminTrendingProducts).mockResolvedValue({
      items: [
        {
          id: 'trending',
          title: trendingTitle,
          purchaseCount: 42,
          lastPurchaseAt: null,
          isTrending: true,
        },
      ],
      total: 1,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(
      await screen.findByRole('button', {
        name: trendingAria,
      }),
    ).toBeInTheDocument();
  });

  it('switches the open popup to English and allows removal without an optional reason', async () => {
    await openTrendingDialog();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const dialog = screen.getByRole('dialog', { name: 'Manage Trending tag' });
    expect(within(dialog).getByLabelText('Reason for removing the tag (optional)')).toHaveAttribute(
      'maxLength',
      '500',
    );
    vi.mocked(removeAdminProductFromTrending).mockResolvedValue({
      success: true,
      message: 'Removed',
      product: { id: 'trending', title: trendingTitle, trendingExcluded: true },
    });
    vi.mocked(listAdminTrendingProducts).mockResolvedValue({ items: [], total: 0 });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Trending tag' }));
    expect(
      await screen.findByText('Removed “Product trending” from Trending.'),
    ).toBeInTheDocument();
    expect(removeAdminProductFromTrending).toHaveBeenCalledWith('trending', '');
  });
});
