import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import CatalogListing from '../../components/products/CatalogListing';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('q')?.trim() ?? '';
  const [inputVal, setInputVal] = useState(search);

  useEffect(() => {
    setInputVal(search);
  }, [search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (trimmed) {
      setParams({ q: trimmed });
    } else {
      setParams({});
    }
  };

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
        <ArrowLeftOutlined /> Quay lại trang chủ
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {search ? (
              <>
                Kết quả tìm kiếm: <span className="text-blue-600">{search}</span>
              </>
            ) : (
              'Khám phá sản phẩm'
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tìm kiếm đồng hồ xa xỉ từ các Seller uy tín trên NEXUS.
          </p>
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
        <CatalogListing key={search} search={search} />
      </section>
    </main>
  );
}
