import api, { apiRequest } from './api';
import type { ProductDetail, ProductItem } from '../types/product.types';
import { MOCK_PRODUCTS_CATALOG } from '../mocks/products.mock';

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
  seller: { id: string; fullName: string; reputationScore?: number } | null;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  status?: string;
  createdAt?: string;
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

export function mapCatalogToProductItem(
  p: CatalogProduct,
  timerAp = '04:18m',
  timerRm = '12:45m',
): ProductItem {
  const titleLower = p.title.toLowerCase();
  const isAuction = titleLower.includes('tourbillon') || titleLower.includes('watson');
  const has3D =
    Boolean(p.threeModelKey) ||
    titleLower.includes('3d') ||
    titleLower.includes('tourbillon') ||
    titleLower.includes('skeleton');

  let brandName = 'NEXUS LUXURY';
  if (titleLower.includes('audemars') || titleLower.includes('royal oak')) {
    brandName = 'AUDEMARS PIGUET • SWISS';
  } else if (titleLower.includes('patek')) {
    brandName = 'PATEK PHILIPPE • GENEVA';
  } else if (titleLower.includes('hublot')) {
    brandName = 'HUBLOT • GENEVA';
  } else if (titleLower.includes('rolex')) {
    brandName = 'ROLEX • GENEVA';
  } else if (titleLower.includes('richard') || titleLower.includes('rm')) {
    brandName = 'RICHARD MILLE • SWISS';
  } else if (titleLower.includes('omega')) {
    brandName = 'OMEGA • SWISS';
  } else if (titleLower.includes('tissot')) {
    brandName = 'TISSOT • 1853';
  } else if (titleLower.includes('cartier')) {
    brandName = 'CARTIER • PARIS';
  }

  return {
    id: p.id,
    brand: brandName,
    title: p.title,
    image: p.thumbnail || p.images[0] || '/images/watches/watch-1.png',
    type: isAuction ? 'live_auction' : 'mall',
    primaryBadge: isAuction
      ? { text: 'LIVE 3D AUCTION', type: 'live' }
      : { text: 'NEXUS MALL', type: 'mall' },
    subBadge: has3D ? { text: '3D Model Verified', icon: '3d' } : { text: 'Chính Hãng 100%' },
    imageOverlay: {
      leftText: has3D ? 'Chạm xoay 360°' : '',
      leftIcon: has3D ? 'rotate' : undefined,
      rightText: isAuction ? 'Đang đấu giá' : '',
    },
    rating: 5.0,
    soldCount: Math.floor(Math.random() * 20) + 5,
    currentPrice: `${p.basePrice.toLocaleString('vi-VN')} ₫`,
    priceColor: isAuction ? 'orange' : 'red',
    priceLabel: isAuction ? 'Giá hiện tại:' : undefined,
    timer: isAuction ? (titleLower.includes('richard') ? timerRm : timerAp) : undefined,
    subMetaLeft: isAuction
      ? `Cọc 10%: ${(p.basePrice * 0.1).toLocaleString('vi-VN')} ₫`
      : 'Freeship GHN Express',
    subMetaRight: isAuction ? 'PayOS Escrow' : undefined,
    subMetaRightType: isAuction ? 'link' : 'green_ship',
    actionButton: isAuction ? { text: 'Tham Gia Đấu Giá', type: 'bid', icon: 'gavel' } : undefined,
    shopId: p.seller?.id,
    shopName: p.seller?.fullName || 'Gian Hàng NEXUS',
    rawPrice: p.basePrice,
  };
}

export async function searchProductsApi(
  query: CatalogQuery = {},
  timerAp = '04:18m',
  timerRm = '12:45m',
): Promise<SearchProductsResult> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: CatalogPage;
  }>('/catalog/products', {
    params: {
      search: query.search || undefined,
      categoryId: query.categoryId || undefined,
      minPrice: query.minPrice || undefined,
      maxPrice: query.maxPrice || undefined,
      page: query.page || 1,
      limit: query.limit || 12,
      sortBy: query.sortBy || undefined,
    },
  });

  const payload = response.data;
  const pageData =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload.data as CatalogPage)
      : (payload as unknown as CatalogPage);

  return {
    items: (pageData.items || []).map((p) => mapCatalogToProductItem(p, timerAp, timerRm)),
    total: pageData.total || 0,
    page: pageData.page || 1,
    limit: pageData.limit || 12,
    totalPages: pageData.totalPages || 1,
  };
}

export async function getCategoriesApi(): Promise<CategoryNode[]> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: CategoryNode[];
  }>('/catalog/categories');
  const payload = response.data;
  return (payload && 'data' in payload ? payload.data : payload) as CategoryNode[];
}

function mapProduct(product: CatalogProduct): ProductDetail {
  const specs: Record<string, string> = {};
  if (product.category) specs['Danh mục'] = product.category.name;
  if (product.weightGrams !== undefined) specs['Khối lượng'] = `${product.weightGrams} g`;
  if (product.lengthCm !== undefined) specs['Chiều dài'] = `${product.lengthCm} cm`;
  if (product.widthCm !== undefined) specs['Chiều rộng'] = `${product.widthCm} cm`;
  if (product.heightCm !== undefined) specs['Chiều cao'] = `${product.heightCm} cm`;
  return {
    id: product.id,
    name: product.title,
    brand: '',
    price: product.basePrice,
    formattedPrice: `${product.basePrice.toLocaleString('vi-VN')} ₫`,
    stock: product.status && product.status !== 'ACTIVE' ? 0 : product.availableQty,
    images: product.images,
    is3d: Boolean(product.threeModelKey),
    categoryName: product.category?.name,
    shop: {
      id: product.seller?.id,
      name: product.seller?.fullName ?? 'Chưa có thông tin người bán',
      verified: false,
      trustScore: product.seller?.reputationScore,
    },
    description: product.description,
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

const MOCK_ID_MAP: Record<string, string> = {
  'ap-tourbillon': '00000000-0000-4000-a000-000000000001',
  'patek-celestial': '00000000-0000-4000-a000-000000000002',
  'hublot-unico': '00000000-0000-4000-a000-000000000003',
  'rolex-daytona': '00000000-0000-4000-a000-000000000004',
  'rolex-submariner': '00000000-0000-4000-a000-000000000004',
  'rm-055': '00000000-0000-4000-a000-000000000005',
  'omega-speedmaster': '00000000-0000-4000-a000-000000000006',
  'tissot-tourelles': '00000000-0000-4000-a000-000000000007',
  'cartier-santos': '00000000-0000-4000-a000-000000000008',
  '1': '00000000-0000-4000-a000-000000000001',
  '2': '00000000-0000-4000-a000-000000000002',
  '3': '00000000-0000-4000-a000-000000000003',
  '4': '00000000-0000-4000-a000-000000000004',
  '5': '00000000-0000-4000-a000-000000000005',
  '6': '00000000-0000-4000-a000-000000000006',
  '7': '00000000-0000-4000-a000-000000000007',
  '8': '00000000-0000-4000-a000-000000000008',
};

export async function getProductByIdAsync(id: string): Promise<ProductDetail> {
  const trimmed = id.trim();
  if (!trimmed) throw new Error('Thiếu mã sản phẩm.');
  const resolvedId = MOCK_ID_MAP[trimmed] || trimmed;
  try {
    return mapProduct(
      await request<CatalogProduct>(`/catalog/products/${encodeURIComponent(resolvedId)}`),
    );
  } catch (error) {
    const fallback = MOCK_PRODUCTS_CATALOG.find((p) => p.id === trimmed || p.id === resolvedId);
    if (fallback) return fallback;
    throw error;
  }
}

export async function getRelatedProducts(currentId: string, limit = 4): Promise<ProductDetail[]> {
  const products = await getProductsCatalog({ limit: limit + 1 });
  return products.filter((product) => product.id !== currentId).slice(0, limit);
}

export interface ShopQuery {
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
  sortBy?: 'reputation' | 'products' | 'newest';
}

export interface ShopListItem {
  id: string;
  name: string;
  sellerFullName: string;
  description: string | null;
  avatarUrl: string | null;
  reputationScore: number;
  trustLevel: string;
  isSellerActive: boolean;
  address: {
    city: string | null;
    district: string | null;
    formattedAddress: string | null;
  } | null;
  stats: {
    totalProducts: number;
  };
  sampleProducts: Array<{
    id: string;
    title: string;
    basePrice: number;
    thumbnail: string | null;
  }>;
}

export interface PaginatedShops {
  items: ShopListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getShopsApi(query: ShopQuery = {}): Promise<PaginatedShops> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: PaginatedShops;
  }>('/catalog/shops', {
    params: {
      search: query.search || undefined,
      city: query.city || undefined,
      page: query.page || 1,
      limit: query.limit || 12,
      sortBy: query.sortBy || undefined,
    },
  });
  const payload = response.data;
  return (payload && 'data' in payload ? payload.data : payload) as PaginatedShops;
}

export async function getShopDetailApi(
  shopId: string,
  page = 1,
  limit = 12,
): Promise<{
  shop: ShopListItem;
  products: {
    items: CatalogProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: {
      shop: ShopListItem;
      products: {
        items: CatalogProduct[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
  }>(`/catalog/shops/${encodeURIComponent(shopId)}`, {
    params: { page, limit },
  });
  const payload = response.data;
  return (payload && 'data' in payload ? payload.data : payload) as unknown as {
    shop: ShopListItem;
    products: {
      items: CatalogProduct[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
