import api, { apiRequest } from './api';
import { getStoredToken } from './auth';
import type { ProductDetail, ProductItem } from '../types/product.types';
import { computeEffectiveSale, saleConfigFromApi } from './productExtras';

export interface CatalogProduct {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  availableQty: number;
  images: string[];
  thumbnail?: string | null;
  threeModelKey: string | null;
  category: { id: string; name: string; slug?: string } | null;
  seller: {
    id: string;
    fullName: string;
    reputationScore?: number;
    avatarUrl?: string | null;
    trustLevel?: string;
    isSellerActive?: boolean;
  } | null;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  status?: string;
  createdAt?: string;
  averageRating?: number;
  reviewCount?: number;
  salePrice?: number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  options?: { id?: string; name: string; values: string[] }[];
}

export interface CatalogPage {
  items: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductsPage extends Omit<CatalogPage, 'items'> {
  items: ProductDetail[];
}

export interface CatalogQuery {
  search?: string;
  categoryId?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
  city?: string;
  minRating?: number;
  inStock?: 'true' | 'false';
}

export interface SearchProductsResult {
  items: ProductItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId?: string | null;
  children?: CategoryNode[];
}

export function mapCatalogToProductItem(p: CatalogProduct): ProductItem {
  const brandName = p.category?.name ? `${p.category.name.toUpperCase()} • LUXURY` : 'NEXUS LUXURY';
  const has3D = Boolean(p.threeModelKey);
  const sale = computeEffectiveSale(
    p.basePrice,
    saleConfigFromApi(p.basePrice, p.salePrice, p.saleStartsAt, p.saleEndsAt),
  );

  return {
    id: p.id,
    brand: brandName,
    title: p.title,
    image:
      p.thumbnail ||
      p.images[0] ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    type: sale.isOnSale ? 'flash_sale' : 'mall',
    primaryBadge: sale.isOnSale
      ? { text: `${sale.label} -${sale.discountPercent}%`, type: 'flash' }
      : { text: 'NEXUS MALL', type: 'mall' },
    subBadge: has3D ? { text: '3D Model Verified', icon: '3d' } : { text: 'Chính Hãng 100%' },
    imageOverlay: {
      leftText: has3D ? 'Chạm xoay 360°' : '',
      leftIcon: has3D ? 'rotate' : undefined,
      rightText: sale.isOnSale ? `-${sale.discountPercent}%` : '',
      isDiscount: sale.isOnSale,
      discountText: sale.isOnSale ? `-${sale.discountPercent}%` : undefined,
    },
    rating: p.averageRating && p.averageRating > 0 ? p.averageRating : 5.0,
    soldCount: 0,
    oldPrice: sale.isOnSale ? `${sale.originalPrice.toLocaleString('vi-VN')} ₫` : undefined,
    currentPrice: `${sale.effectivePrice.toLocaleString('vi-VN')} ₫`,
    priceColor: 'red',
    subMetaLeft: 'Freeship GHN Express',
    subMetaRightType: 'green_ship',
    shopId: p.seller?.id,
    shopName: p.seller?.fullName || 'Gian Hàng NEXUS',
    rawPrice: sale.effectivePrice,
  };
}

export async function searchProductsApi(query: CatalogQuery = {}): Promise<SearchProductsResult> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: CatalogPage;
  }>('/catalog/products', {
    params: {
      search: query.search || undefined,
      categoryId: query.categoryId || undefined,
      city: query.city || undefined,
      minRating: query.minRating || undefined,
      inStock: query.inStock || undefined,
      minPrice: query.minPrice || undefined,
      maxPrice: query.maxPrice || undefined,
      page: query.page || 1,
      limit: query.limit || 12,
      sortBy: query.sortBy || undefined,
    },
  });

  const payload = response?.data;
  const pageData =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload.data as CatalogPage)
      : (payload as unknown as CatalogPage);

  return {
    items: Array.isArray(pageData?.items)
      ? pageData.items.map((p) => mapCatalogToProductItem(p))
      : [],
    total: pageData?.total ?? 0,
    page: pageData?.page ?? 1,
    limit: pageData?.limit ?? 12,
    totalPages: pageData?.totalPages ?? 1,
  };
}

export async function getCategoriesApi(): Promise<CategoryNode[]> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: CategoryNode[];
  }>('/catalog/categories');
  const payload = response?.data;
  const items =
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
  return Array.isArray(items) ? (items as CategoryNode[]) : [];
}

function mapProduct(product: CatalogProduct): ProductDetail {
  const specs: Record<string, string> = {};
  if (product?.category?.name) specs['Danh mục'] = product.category.name;
  if (product?.weightGrams !== undefined) specs['Khối lượng'] = `${product.weightGrams} g`;
  if (product?.lengthCm !== undefined) specs['Chiều dài'] = `${product.lengthCm} cm`;
  if (product?.widthCm !== undefined) specs['Chiều rộng'] = `${product.widthCm} cm`;
  if (product?.heightCm !== undefined) specs['Chiều cao'] = `${product.heightCm} cm`;

  const rawBasePrice = Number(product?.basePrice ?? 0);
  const saleInfo = saleConfigFromApi(
    rawBasePrice,
    product?.salePrice,
    product?.saleStartsAt,
    product?.saleEndsAt,
  );
  const sale = computeEffectiveSale(rawBasePrice, saleInfo);

  if (product?.options && product.options.length > 0) {
    for (const opt of product.options) {
      if (opt.name && opt.values.length > 0) {
        specs[opt.name] = opt.values.join(', ');
      }
    }
  }

  return {
    id: product?.id ?? '',
    name: product?.title ?? '',
    brand: product?.category?.name || 'NEXUS',
    price: sale.effectivePrice,
    originalPrice: rawBasePrice,
    formattedPrice: `${sale.effectivePrice.toLocaleString('vi-VN')} ₫`,
    formattedOldPrice: sale.isOnSale
      ? `${sale.originalPrice.toLocaleString('vi-VN')} ₫`
      : undefined,
    discount: sale.isOnSale ? sale.discountPercent : undefined,
    saleLabel: sale.isOnSale ? sale.label : undefined,
    saleInfo,
    options: product?.options,
    stock: product?.status && product.status !== 'ACTIVE' ? 0 : (product?.availableQty ?? 0),
    images: Array.isArray(product?.images) ? product.images : [],
    is3d: Boolean(product?.threeModelKey),
    categoryName: product?.category?.name,
    category: product?.category,
    rating: product?.averageRating ?? 0,
    reviewsCount: product?.reviewCount ?? 0,
    shop: {
      id: product?.seller?.id,
      name: product?.seller?.fullName ?? 'Chưa có thông tin người bán',
      verified: Boolean(product?.seller?.reputationScore && product.seller.reputationScore >= 80),
      // Tách riêng hoàn toàn Avatar của Shop và Avatar của Seller
      avatarUrl: product?.seller?.avatarUrl ?? undefined,
      trustScore: product?.seller?.reputationScore,
      trustLevel: product?.seller?.trustLevel,
      isSellerActive: product?.seller?.isSellerActive,
    },
    description: product?.description ?? '',
    specs,
  };
}

const pending = new Map<string, Promise<unknown>>();
function request<T>(path: string): Promise<T> {
  const existing = pending.get(path);
  if (existing) return existing as Promise<T>;
  const promise = apiRequest<T>(path).finally(() => {
    if (pending.get(path) === promise) pending.delete(path);
  });
  pending.set(path, promise);
  return promise;
}

export async function getProductsPage(query: CatalogQuery = {}): Promise<ProductsPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const suffix = params.size ? `?${params.toString()}` : '';
  const page = await request<CatalogPage>(`/catalog/products${suffix}`);
  return { ...page, items: page.items.map(mapProduct) };
}

export async function getProductsCatalog(query: CatalogQuery = {}): Promise<ProductDetail[]> {
  return (await getProductsPage(query)).items;
}

export async function getProductByIdAsync(id: string): Promise<ProductDetail> {
  const trimmed = id.trim();
  if (!trimmed) throw new Error('Thiếu mã sản phẩm.');
  return mapProduct(
    await request<CatalogProduct>(`/catalog/products/${encodeURIComponent(trimmed)}`),
  );
}

export async function getRelatedProducts(currentId: string, limit = 4): Promise<ProductDetail[]> {
  const products = await getProductsCatalog({ limit: limit + 1 });
  return products.filter((product) => product.id !== currentId).slice(0, limit);
}

export type {
  ShopQuery,
  ShopListItem,
  PaginatedShops,
  ShopDetailResult,
} from '../types/shop.types';
import type {
  ShopQuery,
  ShopListItem,
  PaginatedShops,
  ShopDetailResult,
} from '../types/shop.types';

export async function getShopsApi(query: ShopQuery = {}): Promise<PaginatedShops> {
  const { search, city, page = 1, limit = 12, sortBy } = query;
  const response = await api.get<{ data: PaginatedShops }>('/catalog/shops', {
    params: {
      search: search || undefined,
      city: city || undefined,
      page,
      limit,
      sortBy: sortBy || undefined,
    },
  });
  const payload = response?.data;
  const data = (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as PaginatedShops;
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? 12,
    totalPages: data?.totalPages ?? 1,
  };
}

export async function getShopDetailApi(
  shopId: string,
  page = 1,
  limit = 12,
): Promise<ShopDetailResult> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: ShopDetailResult;
  }>(`/catalog/shops/${encodeURIComponent(shopId)}`, {
    params: { page, limit },
  });
  const payload = response?.data;
  const data = (payload && typeof payload === 'object' && 'data' in payload
    ? payload.data
    : payload) as unknown as ShopDetailResult;
  const rawShop = data?.shop ?? ({} as ShopListItem);
  return {
    shop: rawShop,
    products: {
      items: Array.isArray(data?.products?.items) ? data.products.items : [],
      total: data?.products?.total ?? 0,
      page: data?.products?.page ?? 1,
      limit: data?.products?.limit ?? 12,
      totalPages: data?.products?.totalPages ?? 1,
    },
  };
}

export interface RecommendedProduct extends CatalogProduct {
  recommendationReason?: 'CATEGORY_INTEREST' | 'POPULAR_OR_RECENT';
}

export interface RecommendationsResult {
  items: RecommendedProduct[];
  personalized: boolean;
}

export async function getRecommendationsApi(limit = 12): Promise<RecommendationsResult> {
  const token = getStoredToken();
  if (token) {
    try {
      const res = await apiRequest<{ items: RecommendedProduct[]; personalized: boolean }>(
        `/catalog/recommendations?page=1&limit=${encodeURIComponent(String(limit))}`,
        { requireAuth: true },
      );
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        return res;
      }
    } catch {
      // Fallback nếu token hết hạn hoặc lỗi mạng
    }
  }

  // Fallback danh sách sản phẩm phổ biến cho khách vãng lai hoặc chưa có lịch sử mua hàng
  const fallback = await getProductsCatalog({ limit, page: 1 });
  return {
    items: fallback.map((p) => ({
      id: p.id,
      title: p.name,
      description: p.description,
      basePrice: p.price,
      salePrice: p.originalPrice && p.price < p.originalPrice ? p.price : null,
      availableQty: p.stock ?? 10,
      images: p.images || [],
      thumbnail: p.images?.[0] || null,
      threeModelKey: null,
      category: p.category
        ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
        : null,
      seller: p.shop?.id ? { id: p.shop.id, fullName: p.shop.name } : null,
      averageRating: p.rating ?? 5,
      reviewCount: p.reviewsCount ?? 0,
      recommendationReason: 'POPULAR_OR_RECENT' as const,
    })),
    personalized: false,
  };
}
