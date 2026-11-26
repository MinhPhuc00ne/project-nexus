import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import {
  Package,
  Store,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  getShopDetailApi,
  getShopProductsApi,
  type ShopListItem,
  type CatalogProduct,
} from '@/features/catalog/services/products.service';
import { addToCart } from '@/features/cart/services/cart';
import ShopHeader from '../../components/shop/ShopHeader';
import ShopProductGrid from '../../components/shop/ShopProductGrid';
import ShopReviewsSection from '../../components/shop/ShopReviewsSection';
import { useAuth } from '../../contexts/AuthContext';
import { openChatWithUser } from '../../components/chat/chatEvents';
import { useToast } from '../../components/ToastNotification';

export const ShopDetailPage: React.FC = () => {
  const { t } = useTranslation('guest');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, storedUser } = useAuth();
  const toast = useToast();

  const [shop, setShop] = useState<ShopListItem | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [productSearchInput, setProductSearchInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const requestId = useRef(0);
  const productRequestId = useRef(0);
  const hasLoadedInitialProducts = useRef(false);

  useEffect(() => {
    if (!id) return;
    const currentRequestId = ++requestId.current;
    hasLoadedInitialProducts.current = false;
    setLoading(true);
    setError(null);

    void getShopDetailApi(id, 1, 12)
      .then((data) => {
        if (requestId.current !== currentRequestId) return;
        setShop(data.shop);
        setProducts(data.products.items || []);
        setTotalPages(data.products.totalPages || 1);
        setTotalProducts(data.products.total || 0);
        hasLoadedInitialProducts.current = true;
      })
      .catch((err: unknown) => {
        if (requestId.current !== currentRequestId) return;
        console.error('Failed to load shop details:', err);
        setError(t('shop.loadFailed'));
      })
      .finally(() => {
        if (requestId.current === currentRequestId) setLoading(false);
      });

    return () => {
      requestId.current++;
    };
  }, [id, t]);

  useEffect(() => {
    if (!id || !hasLoadedInitialProducts.current) return;
    const currentRequestId = ++productRequestId.current;

    void getShopProductsApi(id, productSearch, page, 12)
      .then((productPage) => {
        if (productRequestId.current !== currentRequestId) return;
        setProducts(productPage.items);
        setTotalPages(productPage.totalPages || 1);
        setTotalProducts(productPage.total || 0);
      })
      .catch((err: unknown) => {
        if (productRequestId.current !== currentRequestId) return;
        console.error('Failed to search shop products:', err);
        toast.error(t('shop.loadFailed'));
      });
  }, [id, page, productSearch, t, toast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setProductSearch(productSearchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [productSearchInput]);

  const handleAddToCart = async (product: CatalogProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart(
        {
          id: product.id,
          productId: product.id,
          name: product.title,
          price: product.basePrice,
          formattedPrice: formatCurrency(product.basePrice),
          img:
            product.thumbnail ||
            product.images[0] ||
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
          shopName: shop?.name || 'Nexus Store',
          brand: 'NEXUS LUXURY',
        },
        1,
      );
      toast.success(t('shop.addedToCart', { title: product.title }));
    } catch (err) {
      console.error('Add to cart failed:', err);
      toast.error(err instanceof Error ? err.message : t('shop.addToCartFailed'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-muted">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-base font-semibold">{t('shop.loadingShop')}</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink mb-2">{t('shop.unavailableTitle')}</h2>
          <p className="text-sm text-muted mb-6">{error || t('shop.notFoundFallback')}</p>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            {t('shop.backToSearch')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-ink pb-16">
      <ShopHeader
        shop={shop}
        onShare={() => {
          void (async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              toast.success(t('shop.shareCopied'));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('shop.shareFailed'));
            }
          })();
        }}
        onReported={(msg) => toast.success(msg)}
        onContact={() => {
          if (!token || !storedUser) {
            navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
            return;
          }

          if (storedUser.role !== 'BUYER' && storedUser.role !== 'SELLER') {
            toast.error(t('shop.cannotChatRole'));
            return;
          }

          if (storedUser.id === shop.id) {
            toast.error(t('shop.viewingOwnShop'));
            return;
          }

          openChatWithUser({ userId: shop.id, userName: shop.name });
        }}
      />

      {/* STATS STRIP & TABS */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-6 py-3.5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{t('shop.tabProducts', { count: totalProducts })}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('shop.tabReviews')}</span>
            </button>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5 text-muted">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('shop.verifiedLabel')}</span>
              <strong className="text-emerald-700">{t('shop.verifiedValue')}</strong>
            </div>

            <div className="flex items-center gap-1.5 text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('shop.protectionLabel')}</span>
              <strong className="text-blue-700">{t('shop.protectionValue')}</strong>
            </div>

            <Link
              to="/search"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition ml-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('shop.browseMarketplace')}</span>
            </Link>
          </div>
        </div>
      </section>

      {activeTab === 'products' ? (
        <ShopProductGrid
          products={products}
          totalProducts={totalProducts}
          search={productSearchInput}
          onSearchChange={(value) => {
            setProductSearchInput(value);
            setPage(1);
          }}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onAddToCart={handleAddToCart}
        />
      ) : (
        <ShopReviewsSection shop={shop} />
      )}
    </div>
  );
};

export default ShopDetailPage;
