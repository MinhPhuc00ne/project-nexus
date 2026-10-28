import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Search, Tag, ShoppingBag } from 'lucide-react';
import { addToCart } from '../../services/cart';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBuyerWishlist,
  removeBuyerWishlistItem,
  type WishlistItem,
} from '../../services/wishlist.service';

export default function BuyerWishlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setItems(getBuyerWishlist(user?.id));
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const removeItem = (id: string) => {
    const updated = removeBuyerWishlistItem(user?.id, id);
    setItems(updated);
    showToast('Đã xoá khỏi danh sách yêu thích');
  };

  const handleAddToCart = (item: WishlistItem) => {
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
              items.forEach((item) => handleAddToCart(item));
              showToast('Đã thêm tất cả vào giỏ hàng!');
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
          >
            <ShoppingCart size={13} />
            Thêm tất cả vào giỏ
          </button>
        )}
      </div>

      {/* Search Input */}
      {items.length > 0 && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Tìm trong danh sách yêu thích…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-400 transition"
          />
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-400 mb-4">
            <Heart size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            {search ? 'Không tìm thấy sản phẩm phù hợp' : 'Danh sách yêu thích trống'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
            {search
              ? 'Thử tìm với từ khoá khác'
              : 'Hãy lưu lại những sản phẩm bạn quan tâm để dễ dàng theo dõi và mua sắm sau.'}
          </p>
          <Link
            to="/search"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
          >
            <ShoppingBag size={14} />
            Khám phá sản phẩm ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const hasDiscount = item.originalPrice && item.originalPrice > item.price;
            return (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition"
              >
                {/* Image Area */}
                <div className="relative aspect-square bg-slate-50 overflow-hidden flex items-center justify-center p-4">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  {hasDiscount && (
                    <span className="absolute top-3 left-3 flex items-center gap-1 rounded-lg bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      <Tag size={10} /> -{discountPct(item.originalPrice!, item.price)}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute top-3 right-3 h-8 w-8 rounded-xl bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 shadow-sm flex items-center justify-center transition"
                    title="Xoá khỏi yêu thích"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Info Area */}
                <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 mb-1">{item.shopName}</p>
                    <Link
                      to={`/product/${item.id}`}
                      className="text-xs font-bold text-slate-800 hover:text-blue-600 line-clamp-2 transition leading-snug"
                    >
                      {item.name}
                    </Link>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-sm font-extrabold text-[#f24e1e]">
                        {item.price.toLocaleString('vi-VN')} ₫
                      </span>
                      {hasDiscount && (
                        <span className="text-[11px] text-slate-400 line-through">
                          {item.originalPrice!.toLocaleString('vi-VN')} ₫
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.inStock}
                      className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${
                        item.inStock
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart size={13} />
                      {item.inStock ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
