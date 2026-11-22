import i18n from '../i18n';
import { apiRequest } from './api';
import { getStoredToken } from './auth';
import type { ProductOptionGroup } from './productExtras';

export const PRODUCT_IMAGE_LIMIT = 5;
export const PRODUCT_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export interface ProductCategory {
  id: string;
  name: string;
  children?: ProductCategory[];
}
export interface SellerProduct {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  availableQty: number;
  totalQty: number;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  category: { id: string; name: string };
  images: { imageUrl: string; sortOrder: number }[];
  options?: ProductOptionGroup[];
  salePrice?: number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
}
export const emptyProductForm = {
  title: '',
  description: '',
  categoryId: '',
  price: '',
  quantity: '',
  weight: '',
  length: '',
  width: '',
  height: '',
};
export type SellerProductForm = typeof emptyProductForm;
export interface CreateSellerProduct {
  title: string;
  description: string;
  categoryId: string;
  basePrice: number;
  quantity: number;
  images: string[];
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  options?: ProductOptionGroup[];
}
export function validateProductImages(files: File[]): void {
  if (!files.length || files.length > PRODUCT_IMAGE_LIMIT)
    throw new Error(i18n.t('errors:services.productImagesCount'));
  if (files.some((file) => !PRODUCT_IMAGE_TYPES.includes(file.type)))
    throw new Error(i18n.t('errors:services.imageJpgPngWebp'));
  if (files.some((file) => file.size <= 0 || file.size > PRODUCT_IMAGE_MAX_BYTES))
    throw new Error(i18n.t('errors:services.imageSize1To25'));
}
export function buildProductPayload(
  form: SellerProductForm,
  editing = false,
): Omit<CreateSellerProduct, 'images'> {
  if (!form.title.trim() || !form.description.trim() || !form.categoryId)
    throw new Error(i18n.t('errors:services.productFieldsRequired'));
  const basePrice = Number(form.price);
  if (!Number.isFinite(basePrice) || basePrice < 1000 || basePrice > 999999999999)
    throw new Error(i18n.t('errors:services.productPriceRange'));
  const positiveInteger = (value: string, minimum = 1) => {
    const number = Number(value);
    if (!value.trim() || !Number.isInteger(number) || number < minimum || number > 2147483647)
      throw new Error(i18n.t('errors:services.productDimensionsInvalid'));
    return number;
  };
  const payload: Omit<CreateSellerProduct, 'images'> = {
    title: form.title.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId,
    basePrice,
    quantity: positiveInteger(form.quantity, editing ? 0 : 1),
  };
  for (const [input, output] of [
    ['weight', 'weightGrams'],
    ['length', 'lengthCm'],
    ['width', 'widthCm'],
    ['height', 'heightCm'],
  ] as const) {
    if (form[input].trim()) payload[output] = positiveInteger(form[input]);
  }
  return payload;
}
export function flattenCategories(
  categories: ProductCategory[],
  prefix = '',
): { id: string; label: string }[] {
  return categories.flatMap((category) => {
    const label = prefix ? `${prefix} / ${category.name}` : category.name;
    return [{ id: category.id, label }, ...flattenCategories(category.children ?? [], label)];
  });
}
let categoriesRequest: Promise<ProductCategory[]> | null = null;
export function getProductCategories(): Promise<ProductCategory[]> {
  if (categoriesRequest) return categoriesRequest;
  categoriesRequest = apiRequest<ProductCategory[]>('/catalog/categories').finally(() => {
    categoriesRequest = null;
  });
  return categoriesRequest;
}
const productRequests = new Map<string, Promise<SellerProduct[]>>();
export function getMyProducts(): Promise<SellerProduct[]> {
  const token = getStoredToken();
  if (!token) return Promise.reject(new Error(i18n.t('errors:services.sellerLoginRequired')));
  const existing = productRequests.get(token);
  if (existing) return existing;
  const promise = apiRequest<SellerProduct[]>('/catalog/products/seller/my-products', {
    requireAuth: true,
  }).finally(() => {
    if (productRequests.get(token) === promise) productRequests.delete(token);
  });
  productRequests.set(token, promise);
  return promise;
}
export async function reactivateSellerProduct(id: string): Promise<SellerProduct> {
  const product = await apiRequest<SellerProduct>(`/catalog/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { status: 'ACTIVE' },
    requireAuth: true,
  });
  if (product.id !== id || product.status !== 'ACTIVE')
    throw new Error(i18n.t('errors:services.relistUnconfirmed'));
  return product;
}
export async function publishSellerProduct(
  form: SellerProductForm,
  files: File[],
  uploaded: Map<File, string>,
  onProgress: (message: string) => void,
  edit?: { product: SellerProduct; images: string[] },
  options?: ProductOptionGroup[],
): Promise<{ id: string; title: string }> {
  const payload = buildProductPayload(form, Boolean(edit));
  if (edit && payload.quantity < edit.product.totalQty - edit.product.availableQty)
    throw new Error(i18n.t('errors:services.stockBelowReserved'));
  const existingImages = edit?.images ?? [];
  if (files.length) validateProductImages(files);
  if (
    files.length + existingImages.length < 1 ||
    files.length + existingImages.length > PRODUCT_IMAGE_LIMIT
  )
    throw new Error(i18n.t('errors:services.productImagesCount'));
  const token = getStoredToken();
  const assertSession = () => {
    if (!token || getStoredToken() !== token)
      throw new Error(i18n.t('errors:services.sessionChangedReload'));
  };
  assertSession();
  const images: string[] = [...existingImages];
  for (const [index, file] of files.entries()) {
    assertSession();
    onProgress(
      i18n.t('errors:services.uploadingImageProgress', {
        current: index + 1,
        total: files.length,
      }),
    );
    let url = uploaded.get(file);
    if (!url) {
      const body = new FormData();
      body.append('file', file);
      const result = await apiRequest<{ url: string }>('/media/upload', {
        method: 'POST',
        body,
        isFormData: true,
        requireAuth: true,
      });
      if (!result?.url || !/^https?:\/\//i.test(result.url))
        throw new Error(i18n.t('errors:services.invalidImageUrl'));
      url = result.url;
      uploaded.set(file, url);
    }
    images.push(url);
  }
  assertSession();
  onProgress(
    edit
      ? i18n.t('errors:services.savingChangesProgress')
      : i18n.t('errors:services.publishingProductProgress'),
  );
  const cleanedOptions = options
    ?.map((option) => ({
      name: option.name.trim(),
      values: Array.from(new Set(option.values.map((value) => value.trim()).filter(Boolean))),
    }))
    .filter((option) => option.name && option.values.length > 0);
  const body: Partial<CreateSellerProduct> = {
    ...payload,
    images,
    ...(cleanedOptions?.length ? { options: cleanedOptions } : { options: [] }),
  };
  // Không điều chỉnh kho hoặc ghi nhật ký khi người bán chưa đổi tổng tồn kho.
  if (edit && payload.quantity === edit.product.totalQty) delete body.quantity;
  return apiRequest<{ id: string; title: string }>(
    edit ? `/catalog/products/${encodeURIComponent(edit.product.id)}` : '/catalog/products',
    {
      method: edit ? 'PATCH' : 'POST',
      body,
      requireAuth: true,
    },
  );
}

export function updateProductSale(
  productId: string,
  sale: { salePrice?: number | null; saleStartsAt?: string | null; saleEndsAt?: string | null },
): Promise<SellerProduct> {
  return apiRequest<SellerProduct>(`/catalog/products/${encodeURIComponent(productId)}/sale`, {
    method: 'PATCH',
    body: sale,
    requireAuth: true,
  });
}

export function hideSellerProduct(id: string): Promise<{ success: boolean; message: string }> {
  if (!id.trim()) return Promise.reject(new Error('Thiếu mã sản phẩm.'));
  return apiRequest(`/catalog/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export function sellerProductToForm(product: SellerProduct): SellerProductForm {
  return {
    title: product.title,
    description: product.description,
    categoryId: product.category.id,
    price: String(product.basePrice),
    quantity: String(product.totalQty),
    weight: String(product.weightGrams),
    length: String(product.lengthCm),
    width: String(product.widthCm),
    height: String(product.heightCm),
  };
}
