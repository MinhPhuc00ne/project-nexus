import type {
  AdminProduct,
  AdminProductDetail,
  AdminProductMutationResult,
  QueryAdminProductsParams,
  UpdateProductStatusDto,
  UpdateProductStatusResult,
} from '../types/admin-product.types';
import type {
  CategoryTreeItem,
  CreateCategoryDto,
  DeleteCategoryResult,
  UpdateCategoryDto,
} from '../types/category.types';
import type {
  PaginatedResult,
  AdminShop,
  AdminShopDetail,
  QueryAdminShopsParams,
  UpdateShopStatusDto,
  UpdateShopStatusResult,
  WarnAdminShopDto,
  WarnAdminShopResult,
} from '../types/admin.types';
import type {
  AdminWalletSummary,
  AdminWalletTransactionPage,
  AdminWalletTransactionQueryDto,
  DepositAdminWalletDto,
  DepositAdminWalletResult,
} from '../types/admin-wallet.types';
import { adminRequest } from './adminRequest';

export function getCategoryTree(signal?: AbortSignal): Promise<CategoryTreeItem[]> {
  return adminRequest<CategoryTreeItem[]>({
    url: '/catalog/categories',
    method: 'GET',
    signal,
  });
}

export function createCategory(dto: CreateCategoryDto): Promise<CategoryTreeItem> {
  return adminRequest<CategoryTreeItem>({
    url: '/admin/categories',
    method: 'POST',
    data: dto,
  });
}

export function updateCategory(id: string, dto: UpdateCategoryDto): Promise<CategoryTreeItem> {
  return adminRequest<CategoryTreeItem>({
    url: `/admin/categories/${encodeURIComponent(id)}`,
    method: 'PATCH',
    data: dto,
  });
}

export function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  return adminRequest<DeleteCategoryResult>({
    url: `/admin/categories/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}

export function listAdminProducts(
  params: QueryAdminProductsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<AdminProduct>> {
  return adminRequest<PaginatedResult<AdminProduct>>({
    url: '/admin/products',
    method: 'GET',
    params,
    signal,
  });
}

export function getAdminProductById(id: string, signal?: AbortSignal): Promise<AdminProductDetail> {
  return adminRequest<AdminProductDetail>({
    url: `/admin/products/${encodeURIComponent(id)}`,
    method: 'GET',
    signal,
  });
}

export function updateAdminProductStatus(
  id: string,
  dto: UpdateProductStatusDto,
): Promise<UpdateProductStatusResult> {
  return adminRequest<UpdateProductStatusResult>({
    url: `/admin/products/${encodeURIComponent(id)}/status`,
    method: 'PATCH',
    data: dto,
  });
}

export function deleteAdminProduct(id: string): Promise<AdminProductMutationResult> {
  return adminRequest<AdminProductMutationResult>({
    url: `/admin/products/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}

export function listAdminShops(
  params: QueryAdminShopsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<AdminShop>> {
  return adminRequest<PaginatedResult<AdminShop>>({
    url: '/admin/shops',
    method: 'GET',
    params,
    signal,
  });
}

export function updateAdminShopStatus(
  sellerId: string,
  dto: UpdateShopStatusDto,
): Promise<UpdateShopStatusResult> {
  return adminRequest<UpdateShopStatusResult>({
    url: `/admin/shops/${encodeURIComponent(sellerId)}/status`,
    method: 'PATCH',
    data: dto,
  });
}

export function warnAdminShop(
  sellerId: string,
  dto: WarnAdminShopDto,
): Promise<WarnAdminShopResult> {
  return adminRequest<WarnAdminShopResult>({
    url: `/admin/shops/${encodeURIComponent(sellerId)}/warn`,
    method: 'POST',
    data: dto,
  });
}

export function getAdminShopById(id: string, signal?: AbortSignal): Promise<AdminShopDetail> {
  return adminRequest<AdminShopDetail>({
    url: `/admin/shops/${encodeURIComponent(id)}`,
    method: 'GET',
    signal,
  });
}

export function getAdminWallet(signal?: AbortSignal): Promise<AdminWalletSummary> {
  return adminRequest<AdminWalletSummary>({ url: '/admin/wallet', method: 'GET', signal });
}

export function getAdminWalletTransactions(
  params: AdminWalletTransactionQueryDto,
  signal?: AbortSignal,
): Promise<AdminWalletTransactionPage> {
  return adminRequest<AdminWalletTransactionPage>({
    url: '/admin/wallet/transactions',
    method: 'GET',
    params,
    signal,
  });
}

export function depositToAdminWallet(
  dto: DepositAdminWalletDto,
): Promise<DepositAdminWalletResult> {
  return adminRequest<DepositAdminWalletResult>({
    url: '/admin/wallet/deposit',
    method: 'POST',
    data: dto,
  });
}
