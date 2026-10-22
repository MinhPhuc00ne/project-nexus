import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Search, Tag, Star, ShoppingBag } from 'lucide-react';
import { addToCart } from '../../services/cart';

import { MOCK_BUYER_WISHLIST, type BuyerWishItem } from '../../mocks';

type WishItem = BuyerWishItem;
const mockWishlist = MOCK_BUYER_WISHLIST;

/* ─────────── Component ─────────── */
export default function BuyerWishlistPage() {
  const [items, setItems] = useState<WishItem[]>(mockWishlist);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Đã xoá khỏi danh sách yêu thích');
  };

  const handleAddToCart = (item: WishItem) => {
    if (!item.inStock) return;
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      formattedPrice: item.price.toLocaleString('vi-VN') + ' ₫',
      img: item.img,
      shopName: item.shopName,
      selected: true,
      category: item.category,
    });
    showToast(`Đã thêm "${item.name.slice(0, 40)}…" vào giỏ hàng!`);
  };

  const filtered = items.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.shopName.toLowerCase().includes(search.toLowerCase()),
  );

  const discountPct = (orig: number, price: number) => Math.round(((orig - price) / orig) * 100);

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3.5 text-white shadow-2xl animate-fade-in">
          <Heart size={14} className="text-rose-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Heart size={18} className="text-rose-500" />
            Sản phẩm yêu thích
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{items.length} sản phẩm đã lưu</p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              items.filter((i) => i.inStock).forEach((i) => handleAddToCart(i));
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100 transition shadow-sm"
          >
            <ShoppingCart size={13} />
            Thêm tất cả vào giỏ
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Tìm sản phẩm yêu thích…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 placeholder:text-slate-400 transition"
        />
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <Heart size={36} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Chưa có sản phẩm yêu thích nào</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Bấm ❤️ trên trang sản phẩm để lưu vào đây
          </p>
          <Link
            to="/search"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition shadow-sm"
          >
            <ShoppingBag size={13} />
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition"
            >
              {/* Product Image */}
              <div className="relative overflow-hidden">
                <Link to={`/product/${item.id}`}>
                  <div className="h-44 bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                  </div>
                </Link>
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  {item.originalPrice && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                      <Tag size={9} />-{discountPct(item.originalPrice, item.price)}%
                    </span>
                  )}
                  {!item.inStock && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/80 text-white">
                      Hết hàng
                    </span>
                  )}
                </div>
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 shadow flex items-center justify-center text-rose-500 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                  title="Xoá khỏi yêu thích"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Info */}
              <div className="p-3.5">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1 truncate">
                  {item.shopName}
                </p>
                <Link to={`/product/${item.id}`}>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-blue-600 transition mb-2">
                    {item.name}
                  </h3>
                </Link>

                {/* Rating & Sold */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-0.5 text-[11px] text-amber-500 font-bold">
                    <Star size={11} fill="currentColor" />
                    {item.rating}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-400">Đã bán {item.sold}</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-sm font-extrabold text-[#f24e1e]">
                    {item.price.toLocaleString('vi-VN')} ₫
                  </span>
                  {item.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {item.originalPrice.toLocaleString('vi-VN')} ₫
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.inStock}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                      item.inStock
                        ? 'bg-[#f24e1e] hover:bg-[#d63b0e] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart size={12} />
                    {item.inStock ? 'Thêm vào giỏ' : 'Hết hàng'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition"
                    title="Xoá khỏi yêu thích"
                  >
                    <Heart size={14} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
