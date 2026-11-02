import { useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getProductByIdAsync } from '../../services/products.service';
import type { ProductDetail } from '../../types/product.types';
import { addToCart, fetchCart, type CartItem } from '../../services/cart';
import { getStoredToken } from '../../services/auth';
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
import ProductPurchaseSection from '../../components/productDetail/ProductPurchaseSection';
import CheckoutModal from '../../components/cart/CheckoutModal';

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

  // Mua ngay -> Mở CheckoutModal trực tiếp
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);

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

  async function handleAddToCart() {
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
      setToast({
        type: 'success',
        message: `Đã thêm ${quantity} sản phẩm vào giỏ hàng.`,
      });
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Không thể thêm sản phẩm vào giỏ hàng.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBuyNow() {
    if (!canBuy || quantity < 1 || quantity > product.stock || isSubmitting) return;

    // Kiểm tra đăng nhập trước khi tiến hành thanh toán
    if (!getStoredToken()) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Thêm sản phẩm vào giỏ hàng của người dùng trên hệ thống
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

      // 2. Lấy lại giỏ hàng mới nhất để trích xuất itemID từ backend
      const cart = await fetchCart({ force: true });
      const target = cart.find(
        (i) => String(i.productId) === String(product.id) || String(i.id) === String(product.id),
      );

      const directItem: CartItem = target
        ? { ...target, qty: quantity, selected: true }
        : {
            id: product.id,
            productId: product.id,
            name: product.name,
            price: product.price,
            formattedPrice: product.formattedPrice,
            img: product.images[0] || '',
            qty: quantity,
            shopName: product.shop.name,
            brand: product.brand,
            selected: true,
          };

      // 3. Mở trực tiếp CheckoutModal (bước xác nhận thanh toán) mà không chuyển vào trang /cart
      setCheckoutItems([directItem]);
      setShowCheckoutModal(true);
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Không thể tiến hành đặt hàng.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const directGrandTotal = product.price * quantity;

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
          <ProductPurchaseSection
            product={product}
            quantity={quantity}
            onQuantityChange={setQuantity}
            canBuy={canBuy}
            isSubmitting={isSubmitting}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            isInWishlist={isInWishlist}
            onToggleWishlist={toggleWishlist}
          />
        </section>

        <ProductShopBanner product={product} />
        <ProductInfoTabs product={product} />
        <RelatedProductsSection currentProductId={product.id} />
      </div>

      {/* Modal Xác Nhận Đặt Hàng & Thanh Toán hiển thị trực tiếp khi bấm Mua Ngay */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedItems={checkoutItems}
        shippingFee={30000}
        grandTotal={directGrandTotal + 30000}
        showToast={(msg) => setToast({ type: 'success', message: msg })}
      />
    </main>
  );
}
