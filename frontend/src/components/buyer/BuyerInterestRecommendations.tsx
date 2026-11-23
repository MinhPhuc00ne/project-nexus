import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import { getProductByIdAsync, getProductsPage } from '../../services/products.service';
import { getBuyerOrdersApi } from '../../services/orders';
import type { ProductDetail } from '../../types/product.types';
import {
  getBuyerInterestCategoryIds,
  recordBuyerProductPurchase,
} from '../../utils/buyerProductInterest';
import { useToast } from '../ToastNotification';

interface BuyerInterestRecommendationsProps {
  buyerId: string;
}

export default function BuyerInterestRecommendations({
  buyerId,
}: BuyerInterestRecommendationsProps) {
  const { t, i18n } = useTranslation('buyer');
  const toast = useToast();
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadRecommendations() {
      setLoading(true);
      try {
        const orders = await getBuyerOrdersApi();
        const purchasedProducts = new Map<
          string,
          { categoryId?: string | null; purchasedAt: number }
        >();
        for (const order of [...orders]
          .filter((item) => item.status === 'CONFIRMED' || item.status === 'COMPLETED')
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
          for (const item of order.items) {
            const productId = item.productId || item.product?.id;
            if (!productId || purchasedProducts.has(productId)) continue;
            purchasedProducts.set(productId, {
              categoryId: item.product?.category?.id,
              purchasedAt: Date.parse(order.updatedAt || order.createdAt) || Date.now(),
            });
          }
        }

        await Promise.all(
          [...purchasedProducts.entries()].slice(0, 8).map(async ([productId, purchase]) => {
            try {
              const product = purchase.categoryId ? null : await getProductByIdAsync(productId);
              recordBuyerProductPurchase(
                buyerId,
                { id: productId, categoryId: purchase.categoryId || product?.category?.id },
                purchase.purchasedAt,
              );
            } catch (error) {
              console.warn(`Unable to resolve category for purchased product ${productId}:`, error);
            }
          }),
        );

        const [categoryId] = getBuyerInterestCategoryIds(buyerId);
        if (!categoryId) {
          if (active) setProducts([]);
          return;
        }
        const result = await getProductsPage({
          categoryId,
          page: 1,
          limit: 6,
          sortBy: 'newest',
        });
        if (active) setProducts(result.items);
      } catch (error) {
        console.error('Unable to load Buyer interest recommendations:', error);
        toast.error(t('dashboard.interestRecommendationsLoadFailed'));
        if (active) setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRecommendations();
    return () => {
      active = false;
    };
  }, [buyerId, t, toast]);

  if (loading || products.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Sparkles size={17} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {t('dashboard.interestRecommendationsTitle')}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {t('dashboard.interestRecommendationsDesc')}
            </p>
          </div>
        </div>
        <Link
          to="/search"
          className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          {t('dashboard.viewAll')}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group min-w-0 overflow-hidden rounded-lg border border-slate-200 transition hover:border-blue-300 hover:shadow-sm"
          >
            <div className="aspect-square bg-slate-100">
              <img
                src={product.images[0] || '/placeholder-product.png'}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 min-h-8 text-[11px] font-semibold text-slate-800 group-hover:text-blue-600">
                {product.name}
              </p>
              <p className="mt-1 text-xs font-bold text-blue-700">
                {formatCurrency(product.price, i18n.language)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
