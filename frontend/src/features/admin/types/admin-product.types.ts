export type AdminProductStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';

export interface AdminTrendingProduct {
  id: string;
  title: string;
  purchaseCount: number;
  lastPurchaseAt: string | null;
  isTrending: boolean;
}

export interface AdminTrendingProductsResult {
  items: AdminTrendingProduct[];
  total: number;
}

export interface RemoveAdminProductTrendingResult {
  success: boolean;
  message: string;
  product: {
    id: string;
    title: string;
    trendingExcluded: boolean;
    trendingExcludedAt?: string | null;
  };
}

export interface QueryAdminProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminProductStatus;
  categoryId?: string;
  sellerId?: string;
}

export interface AdminProductStock {
  availableQty: number;
  totalQty: number;
}

export interface AdminProduct {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  status: AdminProductStatus;
  threeModelKey: string | null;
  weightGrams: number;
  category: { id: string; name: string; slug: string; level: number };
  seller: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    avatarUrl: string | null;
    isSellerActive: boolean;
  };
  thumbnailUrl: string | null;
  imagesCount: number;
  stock: AdminProductStock;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductDetail extends Omit<
  AdminProduct,
  'thumbnailUrl' | 'imagesCount' | 'stock'
> {
  dimensions: { lengthCm: number; widthCm: number; heightCm: number };
  category: AdminProduct['category'] & { parent: { id: string; name: string } | null };
  seller: AdminProduct['seller'] & { reputationScore: number; trustLevel: string };
  images: { id: string; imageUrl: string; isThumbnail: boolean; sortOrder: number }[];
  inventories: {
    id: string;
    availableQty: number;
    totalQty: number;
    reservedQty: number;
    warehouse: { id: string; code: string; name: string; address: string | null };
  }[];
  stockSummary: AdminProductStock;
}

export interface UpdateProductStatusDto {
  status: AdminProductStatus;
  reason?: string;
}

export interface AdminProductMutationResult {
  success: boolean;
  message: string;
}

export interface UpdateProductStatusResult extends AdminProductMutationResult {
  product: { id: string; title: string; status: AdminProductStatus };
}

export interface UpdateProductCategoryDto {
  categoryId: string;
  reason?: string;
}

export interface UpdateProductCategoryResult extends AdminProductMutationResult {
  product: { id: string; title: string; categoryId: string; category: AdminProduct['category'] };
}
