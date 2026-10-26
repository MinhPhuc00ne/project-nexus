import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReloadOutlined, ShopOutlined } from '@ant-design/icons';
import { getProductsPage, type CatalogQuery } from '../../services/products.service';
import useProductResource from '../productDetail/useProductResource';
import type { ProductDetail } from '../../types/product.types';

export default function CatalogListing({
  search = '',
  preview = false,
}: {
  search?: string;
  preview?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<NonNullable<CatalogQuery['sortBy']>>('newest');
  const limit = preview ? 8 : 12;
  const load = useCallback(
    () => getProductsPage({ search: search.trim(), page, limit, sortBy }),
    [search, page, limit, sortBy],
  );
  const { data, loading, error, retry } = useProductResource(load);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500" role="status">
          {loading ? 'Đang tải sản phẩm…' : data ? `${data.total} sản phẩm đang bán` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {!preview && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sắp xếp
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as NonNullable<CatalogQuery['sortBy']>);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            <ReloadOutlined className="mr-2" /> Làm mới
          </button>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700"
        >
          <p>{error}</p>
          <button type="button" onClick={retry} className="mt-3 font-semibold underline">
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && data?.items.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
          {search ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm đang bán.'}
        </p>
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {data.items.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </div>
          {!preview && data.totalPages > 1 && (
            <nav
              aria-label="Phân trang sản phẩm"
              className="flex items-center justify-center gap-4 pt-4"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              >
                Trang trước
              </button>
              <span className="text-sm text-slate-600">
                Trang {page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              >
                Trang sau
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function CatalogProductCard({ product }: { product: ProductDetail }) {
  return (
    <Link
      to={`/product/${encodeURIComponent(product.id)}`}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-md focus-visible:outline-blue-500"
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-50">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có ảnh</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="truncate text-xs text-slate-500">{product.categoryName}</p>
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-800">{product.name}</h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShopOutlined className="text-blue-600 shrink-0" />
          <span className="truncate">{product.shop.name}</span>
        </div>
        <p className="mt-auto pt-2 text-base font-bold text-blue-600">{product.formattedPrice}</p>
        <p className={`text-xs ${product.stock > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
          {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}
        </p>
      </div>
    </Link>
  );
}
