import { useEffect, useState } from 'react';
import { Package, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getCategoryTree } from '../../../services/admin';
import type { AdminProduct, AdminProductStatus } from '../../../types/admin-product.types';
import type { CategoryTreeItem } from '../../../types/category.types';
import { flattenCategories } from '../../../utils/category-tree';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { ProductActionDialog, ProductDetailDialog } from './ProductDialogs';
import { formatMoney } from '../shared/adminData';
import { adminProductLabels } from './adminProductData';
import type { AdminTabProps } from '../shared/adminTypes';
import { useAdminProducts } from './useAdminProducts';

export default function ProductManagement({ actions }: AdminTabProps) {
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
          setCategoryError(
            cause instanceof Error ? cause.message : 'Không thể tải bộ lọc danh mục.',
          );
      });
    return () => controller.abort();
  }, [token, categoryRevision]);

  return (
    <Panel
      title="Sản phẩm của Seller"
      subtitle="Xem thông tin, quản lý trạng thái và xử lý sản phẩm trên hệ thống"
      icon={<Package size={19} />}
      action={
        <Button variant="secondary" disabled={loading} onClick={refresh}>
          <RefreshCw size={14} aria-hidden="true" /> Làm mới
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm tên, mô tả sản phẩm hoặc tên/email seller…"
          />
        </div>
        <select
          aria-label="Lọc trạng thái sản phẩm"
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
          <option value="">Tất cả trạng thái</option>
          {Object.entries(adminProductLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc danh mục sản phẩm"
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
          <option value="">Tất cả danh mục</option>
          {flattenCategories(categories).map(({ category, path }) => (
            <option key={category.id} value={category.id}>
              {path}
            </option>
          ))}
        </select>
      </div>
      {categoryError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-red-700">
          <p>Không tải được bộ lọc danh mục: {categoryError}</p>
          <Button variant="secondary" onClick={() => setCategoryRevision((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      )}
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải sản phẩm…
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 py-5 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={refresh}>
            Thử lại
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
                        'Sản phẩm',
                        'Seller',
                        'Giá niêm yết',
                        'Tồn kho',
                        'Trạng thái',
                        'Thao tác',
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
                          <p>{product.stock.availableQty} có thể bán</p>
                          <p className="mt-1 text-slate-500">Tổng: {product.stock.totalQty}</p>
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
                            {adminProductLabels[product.status]}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex max-w-64 flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => setDetailId(product.id)}>
                              Chi tiết
                            </Button>
                            {product.status === 'ACTIVE' ? (
                              <Button
                                variant="danger"
                                onClick={() => setDecision({ product, kind: 'hide' })}
                              >
                                Ẩn
                              </Button>
                            ) : (
                              <Button onClick={() => setDecision({ product, kind: 'activate' })}>
                                {product.status === 'DRAFT' ? 'Cho phép bán' : 'Hiện lại'}
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              aria-label={`Xóa sản phẩm ${product.title}`}
                              title="Xóa sản phẩm"
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
              <EmptyState text="Không có sản phẩm phù hợp với bộ lọc." />
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {result.total} sản phẩm · Trang {result.page}/{Math.max(1, result.totalPages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={result.page <= 1}
                  onClick={() => setQuery((current) => ({ ...current, page: result.page - 1 }))}
                >
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  disabled={result.page >= result.totalPages}
                  onClick={() => setQuery((current) => ({ ...current, page: result.page + 1 }))}
                >
                  Sau
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
