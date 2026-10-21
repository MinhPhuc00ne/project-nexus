import { useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { getProductByIdAsync, type ProductDetail } from '../../components/products';
import { addToCart } from '../../services/cart';
import ProductImageGallery from '../../components/productDetail/ProductImageGallery';
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
  const navigate = useNavigate();
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState('');
  const canBuy = product.stock > 0;
  function add(buyNow: boolean) {
    if (!canBuy || quantity < 1 || quantity > product.stock) return;
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        formattedPrice: product.formattedPrice,
        img: product.images[0] || '',
        shopName: product.shop.name,
        brand: product.brand,
      },
      quantity,
    );
    if (buyNow) navigate('/cart');
    else setToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng.`);
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
          <div role="status" className="rounded-xl bg-blue-50 p-4 text-blue-800">
            {toast}
          </div>
        )}
        <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 lg:grid-cols-12">
          <ProductImageGallery
            product={product}
            selectedImgIdx={selectedImgIdx}
            onSelectImage={setSelectedImgIdx}
          />
          <div className="space-y-6 lg:col-span-7">
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <p className={canBuy ? 'text-emerald-700' : 'text-slate-500'}>
              {canBuy ? `Còn ${product.stock} sản phẩm` : 'Sản phẩm hiện không có hàng để bán'}
            </p>
            <p className="rounded-xl bg-blue-50 p-5 text-3xl font-bold text-blue-600">
              {product.formattedPrice}
            </p>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Số lượng</span>
              <input
                type="number"
                min={1}
                max={product.stock}
                step={1}
                disabled={!canBuy}
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
                disabled={!canBuy}
                onClick={() => add(false)}
                className="rounded-xl border border-blue-600 px-5 py-3 font-semibold text-blue-600 disabled:opacity-40"
              >
                <ShoppingCartOutlined /> Thêm vào giỏ hàng
              </button>
              <button
                type="button"
                disabled={!canBuy}
                onClick={() => add(true)}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
              >
                Mua ngay
              </button>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Người bán</p>
              <p className="font-semibold text-slate-900">{product.shop.name}</p>
              {product.shop.trustScore !== undefined && (
                <p className="text-sm text-slate-600">Điểm uy tín: {product.shop.trustScore}</p>
              )}
            </div>
          </div>
        </section>
        <ProductInfoTabs product={product} />
        <RelatedProductsSection currentProductId={product.id} />
      </div>
    </main>
  );
}
