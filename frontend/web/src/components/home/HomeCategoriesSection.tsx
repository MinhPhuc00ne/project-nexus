import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCategoriesApi, type CategoryNode } from '../../services/products.service';
import { FALLBACK_CATEGORY_TREE, getCategoryImageUrl } from '../../mocks/categories.mock';
import { ROUTES } from '../../routes/paths';

export default function HomeCategoriesSection() {
  const [categories, setCategories] = useState<CategoryNode[]>(FALLBACK_CATEGORY_TREE);

  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const data = await getCategoriesApi();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch {
        // Fallback to FALLBACK_CATEGORY_TREE on offline / error
      }
    }

    void loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayCategories = categories.slice(0, 6);

  return (
    <section className="mt-5 rounded-[18px] border border-sky-200 bg-gradient-to-b from-sky-50/70 to-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sky-500">
            <ShoppingCart size={18} />
          </span>
          <h2 className="text-[15px] font-extrabold uppercase tracking-[0.05em] text-slate-800">
            Danh Mục Sản Phẩm
          </h2>
        </div>

        <Link
          to={ROUTES.CATEGORY}
          className="text-xs font-semibold text-sky-500 hover:text-sky-600 transition"
        >
          Xem tất cả danh mục →
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {displayCategories.map((category) => {
          const imageUrl = getCategoryImageUrl(category);
          const searchUrl = `${ROUTES.SEARCH}?categoryId=${encodeURIComponent(category.id)}&categoryName=${encodeURIComponent(category.name)}`;

          return (
            <Link
              key={category.id}
              to={searchUrl}
              className="group block rounded-[14px] border border-slate-100 bg-slate-50 p-3 text-center transition-[transform,box-shadow,border-color] duration-[180ms] ease-in-out hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:shadow-[0_10px_24px_rgb(28_57_115_/_10%)] motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <img
                src={imageUrl}
                alt={category.name}
                loading="lazy"
                className="mx-auto h-20 w-20 rounded-[14px] object-cover transition-transform duration-200 group-hover:scale-105"
              />

              <h3 className="mt-3 text-[13px] font-bold leading-5 text-slate-700 group-hover:text-blue-600 transition-colors">
                {category.name}
              </h3>

              <p className="mt-1 text-[11px] text-slate-400">
                {category.children && category.children.length > 0
                  ? `${category.children.length} nhóm con`
                  : 'Nhiều sản phẩm'}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
