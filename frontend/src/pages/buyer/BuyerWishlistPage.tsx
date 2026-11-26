import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, ShoppingCart, Trash2, Search, Tag, ShoppingBag } from 'lucide-react';
import { addToCart } from '@/features/cart/services/cart';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ToastNotification';
import {
  getBuyerWishlist,
  removeBuyerWishlistItem,
  type WishlistItem,
} from '@/features/wishlist/services/wishlist.service';
import { formatCurrency } from '../../i18n/formatters';

export default function BuyerWishlistPage() {
  const { t, i18n } = useTranslation('buyer');
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getBuyerWishlist()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Unable to load the wishlist:', error);
        toast.error(error instanceof Error ? error.message : t('wishlist.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // The list belongs to whoever is signed in, so it is reloaded when that changes.
  }, [user?.id, t, toast]);

  const removeItem = async (id: string) => {
    try {
      setItems(await removeBuyerWishlistItem(id));
      toast.success(t('wishlist.removedToast'));
    } catch (error) {
      console.error('Unable to remove the wishlist item:', error);
      toast.error(error instanceof Error ? error.message : t('wishlist.removeFailed'));
    }
  };

  const addWishlistItemToCart = (item: WishlistItem) =>
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      formattedPrice: formatCurrency(item.price, i18n.language),
      img: item.img,
      shopName: item.shopName,
      selected: true,
      category: item.category,
    });

  const handleAddToCart = async (item: WishlistItem) => {
    if (!item.inStock) {
      toast.error(t('wishlist.outOfStockToast'));
      return;
    }
    try {
      await addWishlistItemToCart(item);
      toast.success(t('wishlist.addedToCartToast', { name: item.name.slice(0, 40) }));
    } catch (error) {
      console.error('Unable to add wishlist item to cart:', error);
      toast.error(error instanceof Error ? error.message : t('wishlist.addToCartFailed'));
    }
  };

  const handleAddAllToCart = async () => {
    const availableItems = items.filter((item) => item.inStock);
    if (availableItems.length === 0) {
      toast.error(t('wishlist.outOfStockToast'));
      return;
    }
    const results = await Promise.allSettled(availableItems.map(addWishlistItemToCart));
    const addedCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedResult = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (addedCount > 0) toast.success(t('wishlist.addedAllToCartToast'));
    if (failedResult) {
      console.error('Unable to add all wishlist items to cart:', failedResult.reason);
      toast.error(
        failedResult.reason instanceof Error
          ? failedResult.reason.message
          : t('wishlist.addToCartFailed'),
      );
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Heart size={18} className="text-rose-500" />
            {t('wishlist.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('wishlist.savedCount', { count: items.length })}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => void handleAddAllToCart()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
          >
            <ShoppingCart size={13} />
            {t('wishlist.addAllToCart')}
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
            placeholder={t('wishlist.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-400 transition"
          />
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        // The list comes from the server now, so there is a moment with nothing
        // to show; without this the page claimed the wishlist was empty first.
        <div
          className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8"
          aria-busy="true"
        >
          <div className="h-16 w-16 rounded-2xl bg-slate-100 animate-pulse mb-4" />
          <p className="text-xs text-slate-500">{t('wishlist.loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-400 mb-4">
            <Heart size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            {search ? t('wishlist.emptySearchTitle') : t('wishlist.emptyTitle')}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
            {search ? t('wishlist.emptySearchDesc') : t('wishlist.emptyDesc')}
          </p>
          <Link
            to="/search"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
          >
            <ShoppingBag size={14} />
            {t('wishlist.exploreNow')}
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
                    title={t('wishlist.removeTitle')}
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
                        {formatCurrency(item.price, i18n.language)}
                      </span>
                      {hasDiscount && (
                        <span className="text-[11px] text-slate-400 line-through">
                          {formatCurrency(item.originalPrice!, i18n.language)}
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
                      {item.inStock ? t('wishlist.addToCart') : t('wishlist.outOfStock')}
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
