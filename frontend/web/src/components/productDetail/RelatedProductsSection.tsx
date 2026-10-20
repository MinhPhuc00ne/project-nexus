import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { PRODUCTS_CATALOG } from '../../components/products';

interface RelatedProductsSectionProps {
  currentProductId: string;
}

export default function RelatedProductsSection({ currentProductId }: RelatedProductsSectionProps) {
  const relatedProducts = PRODUCTS_CATALOG.filter((p) => p.id !== currentProductId).slice(0, 4);

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Eye size={20} className="text-[#f24e1e]" />
          Sản Phẩm Tương Tự Có Thể Bạn Thích
        </h3>
        <Link to="/search" className="text-xs font-bold text-indigo-600 hover:underline">
          Xem tất cả sàn &gt;
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {relatedProducts.map((rel) => (
          <Link
            key={rel.id}
            to={`/product/${rel.id}`}
            className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition flex flex-col justify-between"
          >
            <div className="aspect-square bg-slate-50 p-4 overflow-hidden flex items-center justify-center">
              <img
                src={rel.images[0]}
                alt={rel.name}
                className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
              />
            </div>
            <div className="p-3.5">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                {rel.brand.split('•')[0]}
              </span>
              <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-[#f24e1e] transition">
                {rel.name}
              </h4>
              <div className="text-sm font-extrabold text-[#f24e1e]">{rel.formattedPrice}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
