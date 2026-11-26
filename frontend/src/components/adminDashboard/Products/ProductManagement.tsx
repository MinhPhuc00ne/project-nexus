import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  ChevronRight,
  Ellipsis,
  Eye,
  EyeOff,
  Flame,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getCategoryTree } from '@/features/admin/services/admin';
import type { AdminProduct, AdminProductStatus } from '@/features/admin/types/admin-product.types';
import type { CategoryTreeItem } from '@/features/catalog/types/category.types';
import { flattenCategories } from '../../../utils/category-tree';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { ProductActionDialog, ProductDetailDialog } from './ProductDialogs';
import { formatMoney } from '../shared/adminData';
import type { AdminTabProps } from '../shared/adminTypes';
import { useAdminProducts, type TrendingFilter } from './useAdminProducts';
import ProductCategoryDialog from './ProductCategoryDialog';
import ProductTrendingDialog from './ProductTrendingDialog';

const PRODUCT_STATUSES: AdminProductStatus[] = ['ACTIVE', 'INACTIVE', 'DRAFT'];

function productStatusTone(status: AdminProductStatus) {
  if (status === 'ACTIVE') return 'green' as const;
  if (status === 'INACTIVE') return 'red' as const;
  return 'gray' as const;
}

export default function ProductManagement({ actions }: AdminTabProps) {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const {
    search,
    setSearch,
    query,
    setQuery,
    result,
    loading,
    error,
    refresh,
    trendingProducts,
    trendingError,
    trendingFilter,
    setTrendingFilter,
  } = useAdminProducts();
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [categoryRevision, setCategoryRevision] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [categoryProduct, setCategoryProduct] = useState<AdminProduct | null>(null);
  const [trendingProduct, setTrendingProduct] = useState<{
    product: AdminProduct;
    purchaseCount: number;
  } | null>(null);
  const trendingById = new Map(trendingProducts.map((item) => [item.id, item]));
  const categoryOptions = flattenCategories(categories);
  const [decision, setDecision] = useState<{
    product: AdminProduct;
    kind: 'activate' | 'hide' | 'delete';
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCategoryError('');
    void getCategoryTree(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setCategories(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setCategoryError(cause instanceof Error ? cause.message : t('products.loadCategoryErr'));
      });
    return () => controller.abort();
  }, [token, categoryRevision, t]);

  function renderProductList() {
    if (loading) {
      return (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          {t('products.loading')}
        </p>
      );
    }
    if (error) {
      return (
        <div role="alert" className="space-y-3 py-5 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={refresh}>
            {t('products.retry')}
          </Button>
        </div>
      );
    }
    return (
      result && (
        <>
          {result.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-xs">
                <thead className="bg-blue-50 text-slate-500">
                  <tr>
                    {[
                      t('management.product'),
                      t('management.category'),
                      'Seller',
                      t('management.listPrice'),
                      t('management.stock'),
                      t('management.status'),
                      t('management.actions'),
                    ].map((title) => (
                      <th scope="col" key={title} className="p-3 font-semibold">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.items.map((product) => (
                    <tr key={product.id} className="align-top hover:bg-slate-50/70">
                      <td className="p-3">
                        <div className="flex gap-3">
                          {product.thumbnailUrl && (
                            <img
                              src={product.thumbnailUrl}
                              alt=""
                              className="size-14 shrink-0 rounded-lg border border-slate-200 object-contain"
                            />
                          )}
                          <div className="max-w-72 break-words">
                            <p className="font-semibold">{product.title}</p>
                            {trendingById.has(product.id) && (
                              <button
                                type="button"
                                aria-haspopup="dialog"
                                title={t('products.trending.manageTag')}
                                aria-label={t('products.trending.manageAria', {
                                  title: product.title,
                                })}
                                onClick={() =>
                                  setTrendingProduct({
                                    product,
                                    purchaseCount: trendingById.get(product.id)!.purchaseCount,
                                  })
                                }
                                className="group mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100 active:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                              >
                                <Flame size={12} aria-hidden="true" /> {t('products.trending.tag')}
                                <ChevronRight
                                  size={12}
                                  aria-hidden="true"
                                  className="transition-transform group-hover:translate-x-0.5"
                                />
                              </button>
                            )}
                            <p className="mt-1 break-all text-[10px] text-slate-400">
                              {product.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-56 p-3">
                        <div className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 break-words text-slate-600">
                            {categoryOptions.find(
                              ({ category }) => category.id === product.category?.id,
                            )?.path ||
                              product.category?.name ||
                              t('management.uncategorized')}
                          </span>
                          <Button
                            variant="secondary"
                            className="shrink-0 px-2"
                            aria-label={t(
                              product.category
                                ? 'management.changeCategoryAria'
                                : 'management.assignCategoryAria',
                              { title: product.title },
                            )}
                            title={
                              product.category
                                ? t('management.changeCategory')
                                : t('management.assignCategory')
                            }
                            onClick={() => setCategoryProduct(product)}
                          >
                            {product.category ? (
                              <Pencil size={15} aria-hidden="true" />
                            ) : (
                              <Plus size={15} aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="max-w-56 break-words p-3">
                        <p>{product.seller.fullName}</p>
                        <p className="mt-1 break-all text-slate-500">{product.seller.email}</p>
                      </td>
                      <td className="whitespace-nowrap p-3">{formatMoney(product.basePrice)}</td>
                      <td className="p-3">
                        <p>{t('products.availableQty', { count: product.stock.availableQty })}</p>
                        <p className="mt-1 text-slate-500">
                          {t('products.totalQty', { count: product.stock.totalQty })}
                        </p>
                      </td>
                      <td className="p-3">
                        <Badge tone={productStatusTone(product.status)}>
                          {t(`products.statuses.${product.status}`)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex max-w-64 flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            aria-label={t('management.productDetailsAria', {
                              value1: product.title,
                            })}
                            title={t('management.productDetails')}
                            onClick={() => setDetailId(product.id)}
                          >
                            <Ellipsis size={15} aria-hidden="true" />
                          </Button>
                          {product.status === 'ACTIVE' ? (
                            <Button
                              variant="danger"
                              aria-label={t('management.hideProductAria', {
                                value1: product.title,
                              })}
                              title={t('management.hideProduct')}
                              onClick={() => setDecision({ product, kind: 'hide' })}
                            >
                              <EyeOff size={15} aria-hidden="true" />
                            </Button>
                          ) : (
                            <Button
                              aria-label={t(
                                product.status === 'DRAFT'
                                  ? 'management.allowSellAria'
                                  : 'management.showAgainAria',
                                { title: product.title },
                              )}
                              title={
                                product.status === 'DRAFT'
                                  ? t('management.allowSell')
                                  : t('management.showAgain')
                              }
                              onClick={() => setDecision({ product, kind: 'activate' })}
                            >
                              {product.status === 'DRAFT' ? (
                                <BadgeCheck size={15} aria-hidden="true" />
                              ) : (
                                <Eye size={15} aria-hidden="true" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            aria-label={t('products.deleteAria', { title: product.title })}
                            title={t('products.deleteTitle')}
                            onClick={() => setDecision({ product, kind: 'delete' })}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text={t('products.empty')} />
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              {t('products.pagination', {
                total: result.total,
                page: result.page,
                totalPages: Math.max(1, result.totalPages),
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={result.page <= 1}
                onClick={() => setQuery((current) => ({ ...current, page: result.page - 1 }))}
              >
                {t('products.prev')}
              </Button>
              <Button
                variant="secondary"
                disabled={result.page >= result.totalPages}
                onClick={() => setQuery((current) => ({ ...current, page: result.page + 1 }))}
              >
                {t('products.next')}
              </Button>
            </div>
          </div>
        </>
      )
    );
  }
  return (
    <Panel
      title={t('products.title')}
      subtitle={t('products.subtitle')}
      icon={<Package size={19} />}
      action={
        <Button variant="secondary" disabled={loading} onClick={refresh}>
          <RefreshCw size={14} aria-hidden="true" /> {t('products.refresh')}
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('products.searchPlaceholder')}
          />
        </div>
        <select
          aria-label={t('products.statusAria')}
          value={trendingFilter === 'all' ? (query.status ?? '') : trendingFilter}
          onChange={(event) => {
            const value = event.target.value;
            const nextTrending: TrendingFilter = value === 'trending' ? value : 'all';
            setTrendingFilter(nextTrending);
            setQuery((current) => ({
              ...current,
              status:
                nextTrending === 'all'
                  ? ((value || undefined) as AdminProductStatus | undefined)
                  : undefined,
              page: 1,
            }));
          }}
          className="min-h-10 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
        >
          <option value="">{t('products.allStatuses')}</option>
          {PRODUCT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`products.statuses.${value}`)}
            </option>
          ))}
          <option value="trending">{t('products.trending.filterTrending')}</option>
        </select>
        <select
          aria-label={t('products.categoryAria')}
          value={query.categoryId ?? ''}
          onChange={(event) =>
            setQuery((current) => ({
              ...current,
              categoryId: event.target.value || undefined,
              page: 1,
            }))
          }
          className="min-h-10 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
        >
          <option value="">{t('products.allCategories')}</option>
          {flattenCategories(categories).map(({ category, path }) => (
            <option key={category.id} value={category.id}>
              {path}
            </option>
          ))}
        </select>
      </div>
      {categoryError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-red-700">
          <p>{t('products.categoryFilterErrPrefix', { message: categoryError })}</p>
          <Button variant="secondary" onClick={() => setCategoryRevision((value) => value + 1)}>
            {t('products.retry')}
          </Button>
        </div>
      )}
      {trendingError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-amber-800">
          <p>{t('products.trending.statusUnavailable')}</p>
          <Button variant="secondary" onClick={refresh}>
            {t('products.retry')}
          </Button>
        </div>
      )}
      {renderProductList()}
      {trendingProduct && (
        <ProductTrendingDialog
          key={`${token}:${trendingProduct.product.id}`}
          {...trendingProduct}
          onClose={() => setTrendingProduct(null)}
          onRemoved={() => {
            setTrendingProduct(null);
            refresh();
          }}
        />
      )}
      {categoryProduct && (
        <ProductCategoryDialog
          key={`${token}:${categoryProduct.id}`}
          product={categoryProduct}
          onClose={() => setCategoryProduct(null)}
          onCategoriesChanged={() => setCategoryRevision((value) => value + 1)}
          onSaved={(message) => {
            setCategoryProduct(null);
            actions.notify(message);
            refresh();
          }}
        />
      )}
      {detailId && (
        <ProductDetailDialog
          key={detailId}
          productId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
      {decision && (
        <ProductActionDialog
          key={`${decision.product.id}-${decision.kind}`}
          {...decision}
          onClose={() => setDecision(null)}
          onSuccess={(message) => {
            setDecision(null);
            actions.notify(message);
            refresh();
          }}
        />
      )}
    </Panel>
  );
}
