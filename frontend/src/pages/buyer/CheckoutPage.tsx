import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, ArrowLeft, ChevronRight, Package } from 'lucide-react';
import { useToast } from '../../components/ToastNotification';
import { fetchCart, clearCart, type CartItem } from '@/features/cart/services/cart';
import { getAddresses, createAddress, type UserAddress } from '@/features/account/services/address';
import {
  checkoutApi,
  type PayosPaymentInfo,
  type BuyerOrder,
  type ShippingAddressInput,
  type CheckoutPaymentMethodType,
} from '@/features/orders/services/orders';
import { getStoredToken } from '@/features/auth/services/auth';
import CheckoutSuccessCard from '../../components/checkout/CheckoutSuccessCard';
import CheckoutAddressSection from '../../components/checkout/CheckoutAddressSection';
import CheckoutPaymentMethod from '../../components/checkout/CheckoutPaymentMethod';
import CheckoutOrderSummary from '../../components/checkout/CheckoutOrderSummary';

export default function CheckoutPage() {
  const { t } = useTranslation(['commerce', 'common']);
  const navigate = useNavigate();
  const toast = useToast();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);

  // Address State
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState<ShippingAddressInput>({
    recipientName: '',
    phone: '',
    city: 'TP. Hồ Chí Minh',
    district: '',
    ward: '',
    street: '',
  });

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethodType>('PAYOS');

  // Checkout State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [payosPayment, setPayosPayment] = useState<PayosPaymentInfo | null>(null);
  const [createdOrders, setCreatedOrders] = useState<BuyerOrder[]>([]);
  const showToast = (msg: string, variant: 'success' | 'error' = 'success') => {
    toast[variant](msg);
  };

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      setLoadingCart(true);
      try {
        const cart = await fetchCart();
        const selected = cart.filter((i) => i.selected);
        if (isMounted) {
          setItems(selected.length > 0 ? selected : cart);
        }

        const addrList = await getAddresses();
        if (isMounted && Array.isArray(addrList) && addrList.length > 0) {
          setAddresses(addrList);
          const def = addrList.find((a) => a.isDefault) || addrList[0];
          setSelectedAddressId(def?.id ?? '');
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu thanh toán:', err);
      } finally {
        if (isMounted) setLoadingCart(false);
      }
    };

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const activeAddress = addresses.find((a) => a.id === selectedAddressId);
  const currentAddress: ShippingAddressInput = activeAddress
    ? {
        recipientName: activeAddress.recipientName,
        phone: activeAddress.phone,
        city: activeAddress.city,
        district: activeAddress.district || '',
        ward: activeAddress.ward || '',
        street: activeAddress.street,
      }
    : customAddress;

  const rawSubtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingFee = items.length > 0 ? 30000 : 0;
  const grandTotal = rawSubtotal + shippingFee;

  const handleSaveNewAddress = async (addr: ShippingAddressInput) => {
    setCustomAddress(addr);
    try {
      const created = await createAddress({
        recipientName: addr.recipientName.trim(),
        phone: addr.phone.trim(),
        city: addr.city.trim(),
        district: (addr.district || '').trim(),
        ward: (addr.ward || '').trim(),
        street: addr.street.trim(),
        isDefault: true,
      });
      if (created) {
        setAddresses((prev) => [created, ...prev]);
        setSelectedAddressId(created.id);
      }
      showToast(t('commerce:checkoutExtra.addressSavedToast'));
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t('commerce:checkoutExtra.addressSaveFailedToast'),
        'error',
      );
    }
  };

  const handleCheckout = async () => {
    if (
      !currentAddress.recipientName.trim() ||
      !currentAddress.phone.trim() ||
      !currentAddress.street.trim()
    ) {
      showToast(t('commerce:checkoutExtra.addressIncompleteToast'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await checkoutApi({
        shippingAddress: {
          recipientName: currentAddress.recipientName.trim(),
          phone: currentAddress.phone.trim(),
          city: currentAddress.city.trim(),
          district: currentAddress.district ? currentAddress.district.trim() : undefined,
          ward: currentAddress.ward ? currentAddress.ward.trim() : undefined,
          street: currentAddress.street.trim(),
        },
        paymentMethod,
        itemIds: items.map((it) => String(it.id)),
      });

      setCreatedOrders(Array.isArray(res?.orders) ? res.orders : []);
      setPayosPayment(res?.payosPayment ?? null);
      setCheckoutDone(true);
      await clearCart();
    } catch (err: unknown) {
      console.error('Checkout failed:', err);
      const msg =
        err instanceof Error ? err.message : t('commerce:checkoutExtra.checkoutFailedToast');
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingCart) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-muted text-xs">
        {t('commerce:checkout.loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-ink py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-2 text-xs text-muted mb-6">
          <Link to="/" className="hover:text-blue-600 transition">
            {t('common:nav.home')}
          </Link>
          <ChevronRight size={13} />
          <Link to="/cart" className="hover:text-blue-600 transition">
            {t('common:nav.cart')}
          </Link>
          <ChevronRight size={13} />
          <span className="font-semibold text-ink">{t('commerce:checkout.title')}</span>
        </div>

        {checkoutDone && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <CheckoutSuccessCard
              orders={createdOrders}
              isCod={paymentMethod === 'COD'}
              payosPayment={payosPayment}
              grandTotal={grandTotal}
              showToast={showToast}
              primaryAction={
                <Link
                  to="/buyer/orders"
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800"
                >
                  <ShoppingBag size={14} />
                  <span>{t('commerce:checkout.viewMyOrders')}</span>
                </Link>
              }
              secondaryAction={
                <Link
                  to="/search"
                  className="rounded-xl bg-slate-100 px-6 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  {t('commerce:cart.continueShopping')}
                </Link>
              }
            />
          </div>
        )}
        {!checkoutDone && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-sm">
            <Package size={40} className="text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-ink mb-1">
              {t('commerce:checkout.noItemsTitle')}
            </h2>
            <p className="text-xs text-muted mb-6">{t('commerce:checkout.noItemsDesc')}</p>
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
            >
              <ArrowLeft size={14} />
              <span>{t('commerce:checkout.backToCart')}</span>
            </Link>
          </div>
        )}
        {!checkoutDone && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <CheckoutAddressSection
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelectAddressId={setSelectedAddressId}
                currentAddress={currentAddress}
                onSaveNewAddress={handleSaveNewAddress}
                showToast={showToast}
              />
              <CheckoutPaymentMethod
                paymentMethod={paymentMethod}
                onSelectPaymentMethod={setPaymentMethod}
                onShowNotice={showToast}
              />
            </div>
            <div className="lg:col-span-5 space-y-5">
              <CheckoutOrderSummary
                items={items}
                rawSubtotal={rawSubtotal}
                shippingFee={shippingFee}
                grandTotal={grandTotal}
                isSubmitting={isSubmitting}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
