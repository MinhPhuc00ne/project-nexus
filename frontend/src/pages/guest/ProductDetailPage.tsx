import { useCallback, useEffect, useState } from 'react';
import { Role } from '@nexus/contracts';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft as ArrowLeftOutlined } from 'lucide-react';
import { ShoppingCart as ShoppingCartOutlined } from 'lucide-react';
import { Star, Tag, Heart, Flag, Zap, Check, Flame } from 'lucide-react';
import { getProductByIdAsync } from '@/features/catalog/services/products.service';
import type { ProductDetail } from '@/features/catalog/types/product.types';
import { addToCart, fetchCart, type CartItem } from '@/features/cart/services/cart';
import { getStoredToken } from '@/features/auth/services/auth';
import { useAuth } from '../../contexts/AuthContext';
import {
  addBuyerWishlistItem,
  getBuyerWishlistIds,
  removeBuyerWishlistItem,
} from '@/features/wishlist/services/wishlist.service';
import ProductImageGallery from '../../components/productDetail/ProductImageGallery';
import ProductShopBanner from '../../components/productDetail/ProductShopBanner';
import ProductInfoTabs from '../../components/productDetail/ProductInfoTabs';
import RelatedProductsSection from '../../components/productDetail/RelatedProductsSection';
import useProductResource from '../../components/productDetail/useProductResource';
import ReportModal from '../../components/report/ReportModal';
import CheckoutModal from '../../components/cart/CheckoutModal';
import { useToast } from '../../components/ToastNotification';
import { recordBuyerProductView } from '../../utils/buyerProductInterest';

async function buildBuyNowCartItem(
  product: ProductDetail,
  displayNameWithOptions: string,
  quantity: number,
): Promise<CartItem> {
  const cart = await fetchCart({ force: true });
  const cartItem = cart.find(
    (item) =>
      String(item.productId) === String(product.id) || String(item.id) === String(product.id),
  );
  if (cartItem) {
    return { ...cartItem, qty: quantity, selected: true };
  }
  return {
    id: product.id,
    productId: product.id,
    name: displayNameWithOptions,
    price: product.price,
    formattedPrice: product.formattedPrice,
    img: product.images[0] || '',
    qty: quantity,
    shopName: product.shop.name,
    brand: product.brand,
    selected: true,
  };
}

export default function ProductDetailPage() {
  const { t } = useTranslation('guest');
  const { id = '' } = useParams<{ id: string }>();
  const load = useCallback(() => getProductByIdAsync(id), [id]);
  const { data: product, loading, error, retry } = useProductResource(load);
  if (loading)
    return (
      <div role="status" className="p-12 text-center text-slate-600">
        {t('product.loadingProduct')}
      </div>
    );
  if (error || !product)
    return (
      <div
        role="alert"
        className="mx-auto my-12 max-w-xl space-y-4 rounded-xl border border-red-100 bg-white p-8 text-center"
      >
        <h1 className="text-xl font-bold">{t('product.loadErrorTitle')}</h1>
        <p>{error || t('product.notFound')}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          {t('product.retry')}
        </button>
        <Link to="/" className="ml-4 text-blue-600">
          {t('product.backHome')}
        </Link>
      </div>
    );
  return <ProductContent key={product.id} product={product} />;
}

function ProductContent({ product }: { product: ProductDetail }) {
  const { t } = useTranslation('guest');
  const { user } = useAuth();
  const globalToast = useToast();
  const navigate = useNavigate();
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportProductModal, setShowReportProductModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);

  const optionGroups = Array.isArray(product.options)
    ? product.options.filter((g) => g.name && g.values.length > 0)
    : [];

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const grp of optionGroups) {
      if (grp.values[0]) initial[grp.name] = grp.values[0];
    }
    return initial;
  });

  const canBuy = product.stock > 0;

  useEffect(() => {
    let cancelled = false;
    getBuyerWishlistIds()
      .then((ids) => {
        if (!cancelled) setIsInWishlist(ids.includes(product.id));
      })
      .catch((error: unknown) => {
        // A wishlist that cannot be read is not worth interrupting the page for;
        // the heart stays empty and saving still works.
        console.error('Unable to read the wishlist:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, user?.id]);

  useEffect(() => {
    if (user?.role !== Role.BUYER || !product.category?.id) return;
    try {
      recordBuyerProductView(user.id, { id: product.id, categoryId: product.category.id });
    } catch (error) {
      console.error('Unable to save Buyer product interest:', error);
      globalToast.error(t('product.interestSaveFailed'));
    }
  }, [globalToast, product.category?.id, product.id, t, user?.id, user?.role]);

  const toggleWishlist = async () => {
    // Saving is a write to the account now, not to this browser, so the heart
    // follows what the server accepted rather than being set hopefully.
    try {
      if (isInWishlist) {
        await removeBuyerWishlistItem(product.id);
        setIsInWishlist(false);
        setToast({ type: 'success', message: t('product.wishlistRemoved') });
      } else {
        await addBuyerWishlistItem({
          id: product.id,
          name: product.name,
          price: product.price,
          img: product.images[0] || '',
          shopName: product.shop.name,
          category: product.categoryName,
          inStock: product.stock > 0,
        });
        setIsInWishlist(true);
        setToast({ type: 'success', message: t('product.wishlistAdded') });
      }
    } catch (error) {
      console.error('Unable to update the wishlist:', error);
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('product.wishlistFailed'),
      });
    }
  };

  async function add(buyNow: boolean) {
    if (!canBuy || quantity < 1 || quantity > product.stock || isSubmitting) return;

    if (buyNow && !getStoredToken()) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }

    for (const grp of optionGroups) {
      if (!selectedOptions[grp.name]) {
        setToast({
          type: 'error',
          message: t('product.selectOptionError', { name: grp.name }),
        });
        return;
      }
    }

    const optionSummary = optionGroups
      .map((g) => `${g.name}: ${selectedOptions[g.name]}`)
      .join(', ');
    const displayNameWithOptions = optionSummary
      ? `${product.name} (${optionSummary})`
      : product.name;

    setIsSubmitting(true);
    try {
      await addToCart(
        {
          id: product.id,
          productId: product.id,
          name: displayNameWithOptions,
          price: product.price,
          formattedPrice: product.formattedPrice,
          img: product.images[0] || '',
          shopName: product.shop.name,
          brand: product.brand,
          selections: selectedOptions,
        },
        quantity,
      );
      if (buyNow) {
        const directItem = await buildBuyNowCartItem(product, displayNameWithOptions, quantity);
        setCheckoutItems([directItem]);
        setShowCheckoutModal(true);
      } else {
        setToast({
          type: 'success',
          message: t('product.addedToCartToast', {
            count: quantity,
            options: optionSummary ? ` [${optionSummary}]` : '',
          }),
        });
      }
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : t('product.addToCartFailed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] py-6">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4">
        <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <Link to="/" className="text-blue-600 font-medium">
            <ArrowLeftOutlined /> {t('product.breadcrumbHome')}
          </Link>
          <span>/</span>
          <span>{product.categoryName || t('product.breadcrumbProductFallback')}</span>
          <span>/</span>
          <span className="text-slate-800 font-medium">{product.name}</span>
        </nav>

        {toast && (
          <div
            role="alert"
            className={`flex items-center justify-between rounded-lg p-4 text-sm font-medium ${
              toast.type === 'error'
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'border border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-4 font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        <section className="grid gap-8 rounded-lg border border-slate-200 bg-white p-6 lg:grid-cols-12 shadow-xs">
          <ProductImageGallery
            product={product}
            selectedImgIdx={selectedImgIdx}
            onSelectImage={setSelectedImgIdx}
          />
          <div className="space-y-5 lg:col-span-7">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
                <button
                  type="button"
                  onClick={() => setShowReportProductModal(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:border-red-200 hover:bg-red-50/50 hover:text-red-600 transition cursor-pointer"
                  title={t('product.reportProductTitle')}
                >
                  <Flag size={13} />
                  <span>{t('product.reportProduct')}</span>
                </button>
              </div>

              {/* Rating summary under title */}
              <div className="flex items-center gap-3 text-xs mt-2.5 flex-wrap">
                {(product.reviewsCount ?? 0) > 0 ? (
                  <div className="flex items-center gap-1 text-blue-600 font-bold">
                    <span className="underline">
                      {product.rating ? product.rating.toFixed(1) : '0.0'}
                    </span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          className={
                            s <= Math.round(product.rating ?? 0)
                              ? 'fill-blue-600 text-blue-600'
                              : 'text-slate-200 fill-slate-200'
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="font-medium text-slate-400">{t('product.noReviewsYet')}</span>
                )}
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  <strong className="text-slate-900">{product.reviewsCount ?? 0}</strong>{' '}
                  {t('product.reviewsCountLabel')}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  {t('product.soldLabel')}{' '}
                  <strong className="text-slate-900">{product.soldCount ?? 0}</strong>
                </span>
                {product.isTrending && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                    <Flame size={12} />
                    {t('product.trendingBadge')}
                  </span>
                )}
              </div>
            </div>

            {/* Price & Sale Banner */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4 space-y-1.5">
              {product.discount && product.discount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    <Zap size={12} />
                    {product.saleLabel || 'FLASH SALE'} -{product.discount}%
                  </span>
                  <span className="text-xs font-medium text-blue-700">
                    {t('product.shopPromoApplying')}
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-extrabold text-[#1c3973]">
                  {product.formattedPrice}
                </span>
                {product.formattedOldPrice && (
                  <span className="text-sm font-medium text-slate-400 line-through">
                    {product.formattedOldPrice}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-medium text-slate-500">{t('product.categoryLabel')}</span>
                {product.category?.id ? (
                  <Link
                    to={`/search?categoryId=${product.category.id}&categoryName=${encodeURIComponent(product.category.name)}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    <Tag size={13} />
                    {product.category?.parent?.name
                      ? `${product.category.parent.name} › ${product.category.name}`
                      : product.categoryName || t('product.uncategorized')}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    <Tag size={13} />
                    {product.categoryName || t('product.uncategorized')}
                  </span>
                )}
              </div>
              <p className={`text-xs font-semibold ${canBuy ? 'text-blue-700' : 'text-slate-500'}`}>
                {canBuy
                  ? t('product.inStockDetailed', { count: product.stock })
                  : t('product.temporarilyOutOfStock')}
              </p>
            </div>

            {/* TÍNH NĂNG #5: CHỌN PHÂN LOẠI HÀNG / TÙY CHỌN (MÀU SẮC, SIZE, PHIÊN BẢN...) */}
            {optionGroups.length > 0 && (
              <div className="space-y-3.5 border-y border-slate-100 py-4">
                {optionGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{group.name}:</span>
                      {selectedOptions[group.name] && (
                        <span className="font-bold text-blue-700">
                          {t('product.selectedOption', { value: selectedOptions[group.name] })}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.values.map((val) => {
                        const isSelected = selectedOptions[group.name] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setSelectedOptions((prev) => ({ ...prev, [group.name]: val }))
                            }
                            className={`inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-blue-600" />}
                            <span>{val}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>{t('product.quantityLabel')}</span>
              <input
                type="number"
                min={1}
                max={product.stock}
                step={1}
                disabled={!canBuy || isSubmitting}
                value={quantity}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isInteger(next))
                    setQuantity(Math.max(1, Math.min(product.stock, next)));
                }}
                className="block w-28 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canBuy || isSubmitting}
                onClick={() => void add(false)}
                className="rounded-lg border border-blue-600 bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
              >
                <ShoppingCartOutlined />{' '}
                {isSubmitting ? t('product.addingToCart') : t('product.addToCart')}
              </button>
              <button
                type="button"
                disabled={!canBuy || isSubmitting}
                onClick={() => void add(true)}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
              >
                {t('product.buyNow')}
              </button>
              <button
                type="button"
                onClick={toggleWishlist}
                title={isInWishlist ? t('product.removeFromWishlist') : t('product.addToWishlist')}
                aria-label={
                  isInWishlist ? t('product.removeFromWishlist') : t('product.addToWishlist')
                }
                className={`p-3 rounded-lg border transition flex items-center justify-center cursor-pointer ${
                  isInWishlist
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200'
                }`}
              >
                <Heart size={20} className={isInWishlist ? 'fill-blue-600 text-blue-600' : ''} />
              </button>
            </div>
          </div>
        </section>

        <ProductShopBanner
          product={product}
          onReported={(msg) => setToast({ type: 'success', message: msg })}
        />
        <ProductInfoTabs product={product} />
        <RelatedProductsSection currentProductId={product.id} />
      </div>

      <ReportModal
        isOpen={showReportProductModal}
        onClose={() => setShowReportProductModal(false)}
        targetType="PRODUCT"
        targetId={product.id}
        targetName={product.name}
        onReported={(msg) => setToast({ type: 'success', message: msg })}
      />
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedItems={checkoutItems}
        shippingFee={30000}
        grandTotal={product.price * quantity + 30000}
        showToast={(msg) => setToast({ type: 'success', message: msg })}
      />
    </main>
  );
}
