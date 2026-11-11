import { useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Store,
  Star,
  ChevronLeft,
  ChevronRight,
  Truck,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import { getProductsPage, type CatalogQuery } from '../../services/products.service';
import useProductResource from '../productDetail/useProductResource';
import type { ProductDetail } from '../../types/product.types';

export interface CatalogListingProps {
  search?: string;
  categoryId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: 'true' | 'false';
  preview?: boolean;
  onOpenMobileFilter?: () => void;
  activeFilterCount?: number;
}

export default function CatalogListing({
  search = '',
  categoryId = '',
  city,
  minPrice,
  maxPrice,
  minRating,
  inStock,
  preview = false,
  onOpenMobileFilter,
  activeFilterCount = 0,
}: CatalogListingProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<NonNullable<CatalogQuery['sortBy']>>('newest');
  const limit = preview ? 8 : 12;

  useEffect(() => {
    setPage(1);
  }, [search, categoryId, city, minPrice, maxPrice, minRating, inStock]);

  const load = useCallback(
    () =>
      getProductsPage({
        search: search.trim() || undefined,
        categoryId: categoryId.trim() || undefined,
        city: city?.trim() || undefined,
        minPrice,
        maxPrice,
        minRating,
        inStock,
        page,
        limit,
        sortBy,
      }),
    [search, categoryId, city, minPrice, maxPrice, minRating, inStock, page, limit, sortBy],
  );
  const { data, loading, error, retry } = useProductResource(load);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Shopee-style Horizontal Sort Bar */}
      {!preview && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50/80 p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile Filter Trigger Button */}
            {onOpenMobileFilter && (
              <button
                type="button"
                onClick={onOpenMobileFilter}
                className="lg:hidden flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                <span>Bộ lọc</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            <span className="hidden sm:inline-block text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
              Sắp xếp theo:
            </span>

            <button
              type="button"
              onClick={() => {
                setSortBy('newest');
                setPage(1);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                sortBy === 'newest'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Mới Nhất
            </button>

            {/* Price Sorting Selector */}
            <div className="relative inline-flex items-center">
              <select
                value={sortBy === 'price_asc' || sortBy === 'price_desc' ? sortBy : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setSortBy(e.target.value as NonNullable<CatalogQuery['sortBy']>);
                    setPage(1);
                  }
                }}
                className={`appearance-none rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                  sortBy === 'price_asc' || sortBy === 'price_desc'
                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <option value="" disabled className="bg-white text-slate-700">
                  Giá: Chọn thứ tự
                </option>
                <option value="price_asc" className="bg-white text-slate-700">
                  Giá: Thấp đến Cao
                </option>
                <option value="price_desc" className="bg-white text-slate-700">
                  Giá: Cao đến Thấp
                </option>
              </select>
              <ArrowUpDown
                className={`pointer-events-none absolute right-2 h-3.5 w-3.5 ${
                  sortBy === 'price_asc' || sortBy === 'price_desc'
                    ? 'text-white'
                    : 'text-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Right Side: Total Count and Mini Pager */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline" role="status">
              {loading ? (
                'Đang tìm...'
              ) : data ? (
                <>
                  Tìm thấy <strong className="text-slate-800">{data.total}</strong> sản phẩm
                </>
              ) : (
                ''
              )}
            </span>

            {/* Shopee-style Mini Pager (1/17 < >) */}
            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
              <span className="px-2 text-xs font-semibold text-slate-600">
                <span className="text-blue-600">{page}</span>/{totalPages}
              </span>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={retry}
              disabled={loading}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition cursor-pointer"
              title="Làm mới kết quả"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data?.items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <Store className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hãy thử nới lỏng khoảng giá, bỏ chọn bộ lọc địa điểm hoặc tìm kiếm với từ khóa ngắn gọn
            hơn.
          </p>
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {data.items.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Full Bottom Pagination */}
          {!preview && totalPages > 1 && (
            <nav
              aria-label="Phân trang sản phẩm"
              className="flex items-center justify-center gap-2 pt-8"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setPage((current) => current - 1);
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 transition shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Trang trước
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && page > 3) {
                    pageNum = Math.min(totalPages - 4 + i, Math.max(1, page - 2 + i));
                  }
                  const isCurrent = page === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        setPage(pageNum);
                        window.scrollTo({ top: 180, behavior: 'smooth' });
                      }}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((current) => current + 1);
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 transition shadow-2xs cursor-pointer"
              >
                Trang sau <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function CatalogProductCard({ product }: { product: ProductDetail }) {
  const ratingValue = product.rating && product.rating > 0 ? product.rating : 5.0;

  return (
    <Link
      to={`/product/${encodeURIComponent(product.id)}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl focus-visible:outline-blue-500"
    >
      {/* Product Image and Overlay Badges */}
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-50">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có ảnh</span>
        )}

        {/* Top-Left Shopee Mall / Yêu thích Badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          <span className="rounded-md bg-gradient-to-r from-red-600 to-rose-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-xs">
            NEXUS MALL
          </span>
          {product.is3d && (
            <span className="rounded-md bg-blue-600/90 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-xs">
              THẨM ĐỊNH
            </span>
          )}
        </div>

        {/* Top-Right Discount Ribbon */}
        {product.discount && product.discount > 0 ? (
          <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 px-2 py-1 text-[10px] font-extrabold uppercase shadow-xs rounded-bl-lg">
            -{product.discount}%
          </div>
        ) : null}
      </div>

      {/* Product Information */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <p className="truncate text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          {product.categoryName || product.brand}
        </p>

        <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Rating and Sales */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <div className="flex items-center gap-0.5 text-amber-500 font-bold">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{ratingValue.toFixed(1)}</span>
          </div>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 text-[10px]">
            {product.reviewsCount ? `${product.reviewsCount} đánh giá` : 'Chính hãng'}
          </span>
        </div>

        {/* Price Row */}
        <div className="mt-auto pt-2 flex items-baseline gap-2 flex-wrap">
          <p className="text-base sm:text-lg font-extrabold text-red-600 tracking-tight">
            {product.formattedPrice}
          </p>
          {product.formattedOldPrice && (
            <span className="text-[11px] text-slate-400 line-through">
              {product.formattedOldPrice}
            </span>
          )}
        </div>

        {/* Bottom Logistics and Location Meta */}
        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
          <div className="flex items-center gap-1 text-emerald-600 font-medium text-[10px]">
            <Truck className="h-3 w-3" />
            <span>Freeship</span>
          </div>
          <span className="truncate max-w-[90px] text-[10px] text-slate-400">
            {product.shop.name}
          </span>
        </div>
      </div>
    </Link>
  );
}
