import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import CatalogListing from '../../components/products/CatalogListing';
import { getCategoriesApi, type CategoryNode } from '../../services/products.service';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const rawSearch = params.get('q')?.trim() ?? '';
  const rawCategoryId = params.get('categoryId')?.trim() ?? '';
  const rawCategoryName = params.get('categoryName')?.trim() ?? '';

  const [inputVal, setInputVal] = useState(rawSearch);
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  useEffect(() => {
    setInputVal(rawSearch);
  }, [rawSearch]);

  useEffect(() => {
    void getCategoriesApi()
      .then((data) => setCategories(data || []))
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    const nextParams = new URLSearchParams(params);
    if (trimmed) {
      nextParams.set('q', trimmed);
    } else {
      nextParams.delete('q');
    }
    setParams(nextParams);
  };

  const handleClearCategory = () => {
    const nextParams = new URLSearchParams(params);
    nextParams.delete('categoryId');
    nextParams.delete('categoryName');
    setParams(nextParams);
  };

  const matchedCategory = rawCategoryId
    ? categories.find((c) => c.id === rawCategoryId)
    : rawSearch
      ? categories.find((c) => c.name.toLowerCase() === rawSearch.toLowerCase())
      : undefined;

  const categoryId = rawCategoryId || matchedCategory?.id || '';
  const categoryName = rawCategoryName || matchedCategory?.name || '';
  const isCategoryExactSearch = Boolean(
    matchedCategory && rawSearch.toLowerCase() === matchedCategory.name.toLowerCase(),
  );
  const search = isCategoryExactSearch ? '' : rawSearch;

  const renderPageTitle = () => {
    if (search && categoryName) {
      return (
        <>
          Kết quả cho: <span className="text-blue-600 font-semibold">{search}</span> trong danh mục{' '}
          <span className="text-blue-600 font-semibold">{categoryName}</span>
        </>
      );
    }
    if (categoryName) {
      return (
        <>
          Danh mục: <span className="text-blue-600 font-semibold">{categoryName}</span>
          {rawSearch && (
            <span className="text-base font-normal text-slate-500"> (từ khóa: "{rawSearch}")</span>
          )}
        </>
      );
    }
    if (search) {
      return (
        <>
          Kết quả tìm kiếm: <span className="text-blue-600 font-semibold">{search}</span>
        </>
      );
    }
    return 'Khám phá tất cả sản phẩm';
  };

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-8">
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <Link to="/" className="inline-flex items-center gap-1.5 text-blue-600 hover:underline">
          <ArrowLeftOutlined /> Trang chủ
        </Link>
        <span>/</span>
        <Link to="/categories" className="text-slate-600 hover:text-blue-600">
          Danh mục
        </Link>
        {categoryName && (
          <>
            <span>/</span>
            <span className="text-slate-800 font-medium">{categoryName}</span>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{renderPageTitle()}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Khám phá các sản phẩm chất lượng được kiểm định từ các Seller uy tín trên NEXUS.
          </p>

          {(categoryId || categoryName) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                Danh mục: {categoryName || categoryId}
                <button
                  type="button"
                  onClick={handleClearCategory}
                  className="ml-1 text-blue-500 hover:text-red-500 cursor-pointer"
                  title="Bỏ lọc danh mục"
                  aria-label="Bỏ lọc danh mục"
                >
                  <CloseOutlined className="text-[10px]" />
                </button>
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <SearchOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, thương hiệu..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 transition shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm shrink-0 cursor-pointer"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      <section
        aria-label="Danh sách sản phẩm"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      >
        <CatalogListing key={`${search}-${categoryId}`} search={search} categoryId={categoryId} />
      </section>
    </main>
  );
}
