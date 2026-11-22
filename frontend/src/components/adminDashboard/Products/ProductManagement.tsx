import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getCategoryTree } from '../../../services/admin';
import type { AdminProduct, AdminProductStatus } from '../../../types/admin-product.types';
import type { CategoryTreeItem } from '../../../types/category.types';
import { flattenCategories } from '../../../utils/category-tree';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { ProductActionDialog, ProductDetailDialog } from './ProductDialogs';
import { formatMoney } from '../shared/adminData';
import type { AdminTabProps } from '../shared/adminTypes';
import { useAdminProducts } from './useAdminProducts';

const PRODUCT_STATUSES: AdminProductStatus[] = ['ACTIVE', 'INACTIVE', 'DRAFT'];

export default function ProductManagement({ actions }: AdminTabProps) {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const { search, setSearch, query, setQuery, result, loading, error, refresh } =
    useAdminProducts();
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [categoryRevision, setCategoryRevision] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
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
          value={query.status ?? ''}
          onChange={(event) =>
            setQuery((current) => ({
              ...current,
              status: (event.target.value || undefined) as AdminProductStatus | undefined,
              page: 1,
            }))
          }
          className="min-h-10 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
        >
          <option value="">{t('products.allStatuses')}</option>
          {PRODUCT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`products.statuses.${value}`)}
            </option>
          ))}
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
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          {t('products.loading')}
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 py-5 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={refresh}>
            {t('products.retry')}
          </Button>
        </div>
      ) : (
        result && (
          <>
            {result.items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-blue-50 text-slate-500">
                    <tr>
                      {[
                        t('products.cols.product'),
                        t('products.cols.seller'),
                        t('products.cols.price'),
                        t('products.cols.stock'),
                        t('products.cols.status'),
                        t('products.cols.actions'),
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
                              <p className="mt-1 text-slate-500">{product.category.name}</p>
                              <p className="mt-1 break-all text-[10px] text-slate-400">
                                {product.id}
                              </p>
                            </div>
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
                          <Badge
                            tone={
                              product.status === 'ACTIVE'
                                ? 'green'
                                : product.status === 'INACTIVE'
                                  ? 'red'
                                  : 'gray'
                            }
                          >
                            {t(`products.statuses.${product.status}`)}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex max-w-64 flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => setDetailId(product.id)}>
                              {t('products.detailsBtn')}
                            </Button>
                            {product.status === 'ACTIVE' ? (
                              <Button
                                variant="danger"
                                onClick={() => setDecision({ product, kind: 'hide' })}
                              >
                                {t('products.hideBtn')}
                              </Button>
                            ) : (
                              <Button onClick={() => setDecision({ product, kind: 'activate' })}>
                                {product.status === 'DRAFT'
                                  ? t('products.allowSellBtn')
                                  : t('products.showAgainBtn')}
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
