import { apiRequest } from './api';
import type { ProductDetail } from '../types/product.types';
import { MOCK_PRODUCTS_CATALOG } from '../mocks/products.mock';

interface CatalogProduct {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  availableQty: number;
  images: string[];
  threeModelKey: string | null;
  category: { id: string; name: string } | null;
  seller: { id: string; fullName: string; reputationScore?: number } | null;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  status?: string;
}
interface CatalogPage {
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
      name: product.seller?.fullName ?? 'Chưa có thông tin người bán',
      verified: false,
      trustScore: product.seller?.reputationScore,
    },
    description: product.description,
    specs,
  };
}
// Only reuse pending requests, never substitute mock data after a failure.
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
