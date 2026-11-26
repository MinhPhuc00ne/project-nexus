import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCategoriesApi, type CategoryNode } from '@/features/catalog/services/products.service';
import { getCategoryImageUrl } from '../../constants/categoryImages';
import { ROUTES } from '../../routes/paths';

export default function HomeCategoriesSection() {
  const { t } = useTranslation('guest');
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const data = await getCategoriesApi();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch (error) {
        // Nothing to show is the honest answer; the section hides itself.
        console.warn('Unable to load categories:', error);
      }
    }

    void loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayCategories = categories.slice(0, 6);

  return (
    <section className="nexus-panel mt-6 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-primary">
            <ShoppingCart size={18} />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {t('home.categoriesSection.title')}
          </h2>
        </div>

        <Link
          to={ROUTES.CATEGORY}
          className="text-xs font-semibold text-primary hover:text-primary-dark transition"
        >
          {t('home.categoriesSection.viewAll')}
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
              className="group block rounded-[14px] border border-slate-100 bg-slate-50 p-3 text-center transition-[transform,box-shadow,border-color] duration-[180ms] ease-in-out hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-[0_10px_24px_rgb(28_57_115_/_10%)] motion-reduce:transition-none motion-reduce:hover:transform-none"
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
                  ? t('home.categoriesSection.subcategoriesCount', {
                      count: category.children.length,
                    })
                  : t('home.categoriesSection.manyProducts')}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
