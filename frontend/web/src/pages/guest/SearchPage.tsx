import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import CatalogListing from '../../components/products/CatalogListing';

export default function SearchPage() {
  const [params] = useSearchParams();
  const search = params.get('q')?.trim() ?? '';
  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
        <ArrowLeftOutlined /> Quay lại trang chủ
      </Link>
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
        <p className="mt-2 text-sm text-slate-500">Sản phẩm đang được đăng bán trên NEXUS.</p>
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
