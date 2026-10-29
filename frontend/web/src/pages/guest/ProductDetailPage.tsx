import { useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Star, Tag, Heart } from 'lucide-react';
import { getProductByIdAsync } from '../../services/products.service';
import type { ProductDetail } from '../../types/product.types';
import { addToCart } from '../../services/cart';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBuyerWishlist,
  addBuyerWishlistItem,
  removeBuyerWishlistItem,
} from '../../services/wishlist.service';
import ProductImageGallery from '../../components/productDetail/ProductImageGallery';
import ProductShopBanner from '../../components/productDetail/ProductShopBanner';
import ProductInfoTabs from '../../components/productDetail/ProductInfoTabs';
import RelatedProductsSection from '../../components/productDetail/RelatedProductsSection';
import useProductResource from '../../components/productDetail/useProductResource';

export default function ProductDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const load = useCallback(() => getProductByIdAsync(id), [id]);
  const { data: product, loading, error, retry } = useProductResource(load);
  if (loading)
    return (
      <div role="status" className="p-12 text-center text-slate-600">
        Đang tải sản phẩm…
      </div>
    );
  if (error || !product)
    return (
      <div
        role="alert"
        className="mx-auto my-12 max-w-xl space-y-4 rounded-xl border border-red-100 bg-white p-8 text-center"
      >
        <h1 className="text-xl font-bold">Không thể tải sản phẩm</h1>
        <p>{error || 'Sản phẩm không tồn tại.'}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Thử lại
        </button>
        <Link to="/" className="ml-4 text-blue-600">
          Về trang chủ
        </Link>
      </div>
    );
  return <ProductContent key={product.id} product={product} />;
}

function ProductContent({ product }: { product: ProductDetail }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(() =>
    getBuyerWishlist(user?.id).some((i) => i.id === product.id),
  );
  const canBuy = product.stock > 0;

  const toggleWishlist = () => {
    if (isInWishlist) {
      removeBuyerWishlistItem(user?.id, product.id);
      setIsInWishlist(false);
      setToast({ type: 'success', message: 'Đã xóa khỏi danh sách yêu thích.' });
    } else {
      addBuyerWishlistItem(user?.id, {
        id: product.id,
        name: product.name,
        price: product.price,
        img: product.images[0] || '',
        shopName: product.shop.name,
        category: product.categoryName,
        inStock: product.stock > 0,
      });
      setIsInWishlist(true);
      setToast({ type: 'success', message: 'Đã lưu vào danh sách yêu thích.' });
    }
  };

  async function add(buyNow: boolean) {
    if (!canBuy || quantity < 1 || quantity > product.stock || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addToCart(
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          formattedPrice: product.formattedPrice,
          img: product.images[0] || '',
          shopName: product.shop.name,
          brand: product.brand,
        },
        quantity,
      );
      if (buyNow) {
        navigate('/cart');
      } else {
        setToast({
          type: 'success',
          message: `Đã thêm ${quantity} sản phẩm vào giỏ hàng.`,
        });
      }
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Không thể thêm sản phẩm vào giỏ hàng.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-50 py-6">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4">
        <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <Link to="/" className="text-blue-600">
            <ArrowLeftOutlined /> Trang chủ
          </Link>
          <span>/</span>
          <span>{product.categoryName || 'Sản phẩm'}</span>
          <span>/</span>
          <span>{product.name}</span>
        </nav>
        {toast && (
          <div
            role="alert"
            className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
              toast.type === 'error'
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
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
        <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 lg:grid-cols-12">
          <ProductImageGallery
            product={product}
            selectedImgIdx={selectedImgIdx}
            onSelectImage={setSelectedImgIdx}
          />
          <div className="space-y-6 lg:col-span-7">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
              {/* Rating summary under title (Shopee style) */}
              <div className="flex items-center gap-3 text-xs mt-2 flex-wrap">
                {(product.reviewsCount ?? 0) > 0 ? (
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
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
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 fill-slate-200'
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="font-medium text-slate-400">Chưa có đánh giá</span>
                )}
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  <strong className="text-slate-900">{product.reviewsCount ?? 0}</strong> Đánh Giá
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  Đã bán <strong className="text-slate-900">{product.soldCount ?? 0}</strong>
                </span>
              </div>
            </div>
            <p className={canBuy ? 'text-emerald-700' : 'text-slate-500'}>
              {canBuy ? `Còn ${product.stock} sản phẩm` : 'Sản phẩm hiện không có hàng để bán'}
            </p>
            <p className="rounded-xl bg-blue-50 p-5 text-3xl font-bold text-blue-600">
              {product.formattedPrice}
            </p>
            <div className="flex items-center gap-2.5 text-sm">
              <span className="font-medium text-slate-500">Danh mục:</span>
              {product.category?.id ? (
                <Link
                  to={`/search?categoryId=${product.category.id}&categoryName=${encodeURIComponent(product.category.name)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Tag size={13} />
                  {product.category?.parent?.name
                    ? `${product.category.parent.name} › ${product.category.name}`
                    : product.categoryName || 'Chưa phân loại'}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <Tag size={13} />
                  {product.categoryName || 'Chưa phân loại'}
                </span>
              )}
            </div>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Số lượng</span>
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
                className="block w-28 rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canBuy || isSubmitting}
                onClick={() => add(false)}
                className="rounded-xl border border-blue-600 px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-40"
              >
                <ShoppingCartOutlined /> {isSubmitting ? 'Đang thêm…' : 'Thêm vào giỏ hàng'}
              </button>
              <button
                type="button"
                disabled={!canBuy || isSubmitting}
                onClick={() => add(true)}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                Mua ngay
              </button>
              <button
                type="button"
                onClick={toggleWishlist}
                title={isInWishlist ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                aria-label={isInWishlist ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                className={`p-3 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                  isInWishlist
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200'
                }`}
              >
                <Heart size={20} className={isInWishlist ? 'fill-rose-500 text-rose-500' : ''} />
              </button>
            </div>
          </div>
        </section>
        <ProductShopBanner product={product} />
        <ProductInfoTabs product={product} />
        <RelatedProductsSection currentProductId={product.id} />
      </div>
    </main>
  );
}
