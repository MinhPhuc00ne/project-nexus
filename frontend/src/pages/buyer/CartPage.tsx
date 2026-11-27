import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShoppingBag, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import BuyerPageHeader from '../../components/buyer/BuyerPageHeader';
import { Button, buttonVariants } from '../../components/ui/button';
import { useToast } from '../../components/ToastNotification';
import {
  getCartItems,
  fetchCart,
  updateCartQty,
  removeFromCart,
  toggleSelectItem,
  toggleSelectAll,
  type CartItem,
} from '@/features/cart/services/cart';
import { getAddresses } from '@/features/account/services/address';
import CheckoutModal from '../../components/cart/CheckoutModal';
import CartOrderSummary from '../../components/cart/CartOrderSummary';
import CartItemList from '../../components/cart/CartItemList';
import { getStoredToken } from '@/features/auth/services/auth';
import {
  getCheckoutQuoteApi,
  type ShippingAddressInput as DeliveryAddress,
} from '@/features/orders/services/orders';

export type { DeliveryAddress };

export default function CartPage() {
  const { t } = useTranslation(['commerce', 'common']);
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(
    null,
  );
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const [shippingQuote, setShippingQuote] = useState<number | null>(null);
  const [isQuotingShipping, setIsQuotingShipping] = useState(false);
  const [shippingQuoteFailed, setShippingQuoteFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handleCartSync = () => setItems(getCartItems());
    window.addEventListener('nexus:cart-change', handleCartSync);
    window.addEventListener('storage', handleCartSync);

    const loadData = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const fetched = await fetchCart({ force: loadRevision > 0 });
        if (isMounted) setItems(fetched);
      } catch (err) {
        console.error('Lỗi tải giỏ hàng:', err);
        if (isMounted) setLoadFailed(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void loadData();

    return () => {
      isMounted = false;
      window.removeEventListener('nexus:cart-change', handleCartSync);
      window.removeEventListener('storage', handleCartSync);
    };
  }, [loadRevision]);

  useEffect(() => {
    if (!getStoredToken()) return;
    let isMounted = true;
    getAddresses()
      .then((addresses) => {
        if (!isMounted) return;
        const address = addresses.find((item) => item.isDefault) || addresses[0];
        if (address) {
          setDeliveryAddress({
            recipientName: address.recipientName,
            phone: address.phone,
            city: address.city,
            district: address.district || '',
            ward: address.ward || '',
            street: address.street,
          });
        }
      })
      .catch((err: unknown) => {
        console.error('Lỗi tải địa chỉ mặc định để báo giá vận chuyển:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (msg: string, variant: 'success' | 'error' = 'success') => {
    toast[variant](msg);
  };

  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items]);
  const totalQuantity = items.reduce((sum, i) => sum + i.qty, 0);
  const rawSubtotal = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const isFreeShipping = appliedVoucher?.code === 'FREESHIP';
  const effectiveShippingFee = isFreeShipping ? 0 : shippingQuote;
  const grandTotal = Math.max(0, rawSubtotal - discountAmount) + (effectiveShippingFee ?? 0);
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  useEffect(() => {
    if (selectedItems.length === 0 || !deliveryAddress || isFreeShipping) {
      setShippingQuote(null);
      setIsQuotingShipping(false);
      setShippingQuoteFailed(false);
      return;
    }

    let isCurrent = true;
    setShippingQuote(null);
    setIsQuotingShipping(true);
    setShippingQuoteFailed(false);
    getCheckoutQuoteApi({
      shippingAddress: deliveryAddress,
      itemIds: selectedItems.map((item) => String(item.id)),
    })
      .then((quote) => {
        if (isCurrent) setShippingQuote(quote.totalShippingFee);
      })
      .catch((err: unknown) => {
        console.error('Lỗi tính phí vận chuyển trong giỏ hàng:', err);
        if (isCurrent) setShippingQuoteFailed(true);
      })
      .finally(() => {
        if (isCurrent) setIsQuotingShipping(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [deliveryAddress, isFreeShipping, selectedItems]);

  const handleUpdateQty = async (id: string | number, qty: number) => {
    try {
      await updateCartQty(id, qty);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('commerce:cart.updateFailed'), 'error');
    }
  };

  const handleRemove = async (id: string | number) => {
    try {
      await removeFromCart(id);
      showToast(t('commerce:cart.removedToast'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('commerce:cart.removeFailed'), 'error');
    }
  };

  return (
    <main className="min-h-[calc(100dvh-10rem)] bg-canvas py-6 sm:py-8">
      <div className="storefront-container space-y-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link to="/" className="hover:text-primary transition">
              {t('common:nav.home')}
            </Link>
            <ChevronRight size={13} />
            <span className="font-semibold text-ink">{t('commerce:cart.title')}</span>
          </nav>
          <Link to="/search" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft size={14} />
            {t('commerce:cart.continueShopping')}
          </Link>
        </div>

        <BuyerPageHeader
          title={t('commerce:cart.heading', { count: totalQuantity })}
          description={t('commerce:cart.pageDescription')}
          icon={<ShoppingBag size={22} />}
          actions={
            loading &&
            items.length > 0 && (
              <span role="status" className="flex items-center gap-2 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" />
                {t('commerce:cart.loading')}
              </span>
            )
          }
        />

        {loadFailed && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              {t('commerce:cart.loadFailed')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLoadRevision((current) => current + 1)}
            >
              {t('common:actions.retry')}
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          loading ? (
            <div
              role="status"
              className="nexus-panel flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-sm text-muted"
            >
              <Loader2 size={28} className="animate-spin text-primary" />
              {t('commerce:cart.loading')}
            </div>
          ) : (
            !loadFailed && (
              <div className="nexus-panel mx-auto flex max-w-xl flex-col items-center px-6 py-12 text-center sm:py-16">
                <div className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-blue-50 text-primary">
                  <ShoppingBag size={36} />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-ink">{t('commerce:cart.empty')}</h2>
                <p className="mb-7 max-w-sm text-sm leading-relaxed text-muted">
                  {t('commerce:cart.emptyDesc')}
                </p>
                <Link to="/search" className={buttonVariants({ size: 'lg' })}>
                  {t('commerce:cart.continueShopping')}
                </Link>
              </div>
            )
          )
        ) : (
          <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
            <CartItemList
              items={items}
              isAllSelected={isAllSelected}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelectItem={toggleSelectItem}
              onUpdateQty={handleUpdateQty}
              onRemoveItem={handleRemove}
            />

            <CartOrderSummary
              selectedItems={selectedItems}
              rawSubtotal={rawSubtotal}
              grandTotal={grandTotal}
              shippingFee={effectiveShippingFee}
              isQuotingShipping={isQuotingShipping}
              shippingQuoteFailed={shippingQuoteFailed}
              hasDeliveryAddress={Boolean(deliveryAddress)}
              appliedVoucher={appliedVoucher}
              onApplyVoucher={(code) => {
                if (code === 'NEXUS500K') {
                  setAppliedVoucher({ code: 'NEXUS500K', discount: 500000 });
                  showToast(t('commerce:cartExtra.voucher500kApplied'));
                } else if (code === 'FREESHIP') {
                  setAppliedVoucher({ code: 'FREESHIP', discount: 150000 });
                  showToast(t('commerce:cartExtra.voucherFreeshipApplied'));
                }
              }}
              onRemoveVoucher={() => setAppliedVoucher(null)}
              onProceedCheckout={() => {
                if (!getStoredToken()) {
                  navigate('/login', { state: { from: '/cart' } });
                  return;
                }
                const hasOutOfStock = selectedItems.some((i) => i.isOutOfStock);
                if (hasOutOfStock) {
                  showToast(t('commerce:cart.outOfStockError'), 'error');
                  return;
                }
                const hasInsufficient = selectedItems.some((i) => i.isStockInsufficient);
                if (hasInsufficient) {
                  showToast(t('commerce:cart.insufficientStockError'), 'error');
                  return;
                }
                setShowCheckoutModal(true);
              }}
            />
          </div>
        )}
      </div>

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onCheckoutSuccess={() => setItems([])}
        selectedItems={selectedItems}
        shippingFee={effectiveShippingFee ?? 30000}
        grandTotal={effectiveShippingFee === null ? grandTotal + 30000 : grandTotal}
        showToast={showToast}
      />
    </main>
  );
}
