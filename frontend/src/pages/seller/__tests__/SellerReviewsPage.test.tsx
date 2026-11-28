import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import SellerReviewsPage from '../SellerReviewsPage';

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockGetSellerProductReviewsApi = vi.fn();
const mockGetSellerShopReviewsApi = vi.fn();
const mockGetReviewRepliesApi = vi.fn();
const mockCreateReviewReplyApi = vi.fn();

vi.mock('../../../components/seller/SellerSession', () => ({
  useSellerSession: () => ({
    id: 'seller-1',
    isSellerActive: true,
    isShopSuspended: false,
    reputationScore: 95,
    trustLevel: 'EXCELLENT',
  }),
}));

vi.mock('../../../components/ToastNotification', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

vi.mock('@/features/reviews/services/reviews.service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/reviews/services/reviews.service')>();
  return {
    ...actual,
    getSellerProductReviewsApi: (...args: unknown[]) => mockGetSellerProductReviewsApi(...args),
    getSellerShopReviewsApi: (...args: unknown[]) => mockGetSellerShopReviewsApi(...args),
    getReviewRepliesApi: (...args: unknown[]) => mockGetReviewRepliesApi(...args),
    createReviewReplyApi: (...args: unknown[]) => mockCreateReviewReplyApi(...args),
  };
});

const PRODUCT_REVIEW_ID = 'prod-rev-1';
const REPLY_TEXT = 'Cảm ơn bạn đã ủng hộ shop!';

const sampleProductReviews = {
  items: [
    {
      id: PRODUCT_REVIEW_ID,
      productId: 'prod-1',
      rating: 5,
      comment: 'Sản phẩm rất đẹp và đóng gói kỹ.',
      mediaUrls: ['https://example.com/review-photo.jpg'],
      createdAt: '2026-11-26T10:00:00.000Z',
      reviewer: { id: 'buyer-1', fullName: 'Nguyễn Văn A', avatarUrl: null },
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
};

const sampleShopReviews = {
  items: [
    {
      id: 'shop-rev-1',
      rating: 2,
      comment: 'Giao hàng hơi chậm.',
      createdAt: '2026-11-25T09:00:00.000Z',
      reviewer: { id: 'buyer-2', fullName: 'Trần Thị B', avatarUrl: null },
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
  totalPages: 1,
  stats: {
    averageRating: 2,
    totalReviews: 1,
    distribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
  },
};

describe('SellerReviewsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockGetSellerProductReviewsApi.mockReset().mockResolvedValue(sampleProductReviews);
    mockGetSellerShopReviewsApi.mockReset().mockResolvedValue(sampleShopReviews);
    mockGetReviewRepliesApi.mockReset().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockCreateReviewReplyApi.mockReset().mockResolvedValue({
      id: 'reply-1',
      authorId: 'seller-1',
      authorRole: 'SELLER',
      content: REPLY_TEXT,
      createdAt: '2026-11-27T11:00:00.000Z',
      author: { id: 'seller-1', fullName: 'Shop Nexus', avatarUrl: null },
      media: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads reviews and forwards 1-5 star filter and date sort to backend APIs', async () => {
    render(
      <MemoryRouter>
        <SellerReviewsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    });

    expect(mockGetSellerProductReviewsApi).toHaveBeenCalledWith(1, 50, {
      rating: undefined,
      sortBy: 'newest',
    });
    expect(mockGetSellerShopReviewsApi).toHaveBeenCalledWith(1, 50, {
      rating: undefined,
      sortBy: 'newest',
    });

    const fiveStarBtn = screen.getByRole('button', { name: '5 sao' });
    fireEvent.click(fiveStarBtn);

    await waitFor(() => {
      expect(mockGetSellerProductReviewsApi).toHaveBeenCalledWith(1, 50, {
        rating: 5,
        sortBy: 'newest',
      });
      expect(mockGetSellerShopReviewsApi).toHaveBeenCalledWith(1, 50, {
        rating: 5,
        sortBy: 'newest',
      });
    });

    const sortSelect = screen.getByLabelText('Sắp xếp');
    fireEvent.change(sortSelect, { target: { value: 'oldest' } });

    await waitFor(() => {
      expect(mockGetSellerProductReviewsApi).toHaveBeenCalledWith(1, 50, {
        rating: 5,
        sortBy: 'oldest',
      });
    });
  });

  it('expands 2-way reply thread, validates media, and submits a reply', async () => {
    render(
      <MemoryRouter>
        <SellerReviewsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button', { name: 'Phản hồi & Trao đổi' });
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(mockGetReviewRepliesApi).toHaveBeenCalledWith('product', PRODUCT_REVIEW_ID, 1, 20);
    });

    // Oversized image (> 5MB) should trigger validation error
    const fileInput = screen.getByLabelText('Đính kèm ảnh/video');
    const oversizedFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(screen.getByText('Ảnh vượt quá giới hạn 5MB.')).toBeInTheDocument();
    expect(mockCreateReviewReplyApi).not.toHaveBeenCalled();

    // Valid image + reply text
    const validFile = new File(['hello'], 'proof.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const textarea = screen.getByPlaceholderText('Nhập nội dung phản hồi cho khách hàng…');
    fireEvent.change(textarea, { target: { value: REPLY_TEXT } });

    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));

    await waitFor(() => {
      expect(mockCreateReviewReplyApi).toHaveBeenCalledWith('product', PRODUCT_REVIEW_ID, {
        content: REPLY_TEXT,
        files: [validFile],
      });
      expect(mockToastSuccess).toHaveBeenCalledWith('Đã gửi phản hồi đánh giá.');
      expect(screen.getByText(REPLY_TEXT)).toBeInTheDocument();
    });
  });
});
