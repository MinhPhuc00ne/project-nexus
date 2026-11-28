import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Popup from '../Popup';
import { clearCart, type CartItem } from '@/features/cart/services/cart';
import { getStoredToken } from '@/features/auth/services/auth';
import { getAddresses, createAddress, type UserAddress } from '@/features/account/services/address';
import {
  checkoutApi,
  getCheckoutQuoteApi,
  type PayosPaymentInfo,
  type BuyerOrder,
  type ShippingAddressInput,
  type CheckoutPaymentMethodType,
  DEFAULT_SHIPPING_ADDRESS,
} from '@/features/orders/services/orders';
import { Loader2 } from 'lucide-react';
import CheckoutSuccessCard from '../checkout/CheckoutSuccessCard';
import CheckoutAddressSection from '../checkout/CheckoutAddressSection';
import CheckoutPaymentMethod from '../checkout/CheckoutPaymentMethod';
import CheckoutItemsSummary from '../checkout/CheckoutItemsSummary';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  shippingFee?: number;
  grandTotal?: number;
  onCheckoutSuccess?: () => void;
  showToast: (msg: string, variant?: 'success' | 'error') => void;
}

function getCheckoutErrorMessage(err: unknown, fallback: string): string {
  const resMsg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(resMsg)) return resMsg.join(', ');
  if (typeof resMsg === 'string') return resMsg;
  return fallback;
}

function getCheckoutModalTitle(
  checkoutSuccess: boolean,
  paymentMethod: CheckoutPaymentMethodType,
  isPaid: boolean,
  payosPayment: PayosPaymentInfo | null,
  t: TFunction<'commerce'>,
): string {
  if (!checkoutSuccess) return t('checkout.modalTitleConfirm');
  if (paymentMethod === 'COD') return t('checkout.modalTitleCodSuccess');
  if (isPaid) return t('checkout.modalTitlePaidSuccess');
  if (payosPayment) return t('checkout.modalTitleScanPayos');
  return t('checkout.modalTitleOrderSuccess');
}

function getCheckoutButtonLabel(
  isProcessingOrder: boolean,
  isCalculatingFee: boolean,
  t: TFunction<'commerce'>,
): string {
  if (isProcessingOrder) return t('checkout.processingOrder');
  if (isCalculatingFee) return t('checkout.calculatingGhn');
  return t('checkout.confirmOrder');
}

export default function CheckoutModal({
  isOpen,
  onClose,
  selectedItems,
  shippingFee,
  grandTotal: propGrandTotal,
  onCheckoutSuccess,
  showToast,
}: CheckoutModalProps) {
  const { t } = useTranslation('commerce');
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customAddress, setCustomAddress] =
    useState<ShippingAddressInput>(DEFAULT_SHIPPING_ADDRESS);

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethodType>('PAYOS');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [payosPayment, setPayosPayment] = useState<PayosPaymentInfo | null>(null);
  const [createdOrders, setCreatedOrders] = useState<BuyerOrder[]>([]);
  const [successGrandTotal, setSuccessGrandTotal] = useState<number>(0);
  const [dynamicShippingFee, setDynamicShippingFee] = useState<number | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);

  useEffect(() => {
    if (!isOpen || !getStoredToken()) return;
    getAddresses()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setAddresses(list);
          const def = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(def?.id ?? '');
        }
      })
      .catch(() => {});
  }, [isOpen]);

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

  const itemsSubtotal = selectedItems.reduce((sum, it) => sum + it.price * it.qty, 0);
  const actualShippingFee =
    dynamicShippingFee !== null ? dynamicShippingFee : (shippingFee ?? 30000);
  const computedGrandTotal =
    propGrandTotal !== undefined && dynamicShippingFee === null
      ? propGrandTotal
      : itemsSubtotal + actualShippingFee;

  useEffect(() => {
    if (!isOpen || !currentAddress?.city || selectedItems.length === 0) return;
    let isCancelled = false;
    setIsCalculatingFee(true);

    getCheckoutQuoteApi({
      shippingAddress: {
        recipientName: currentAddress.recipientName || 'Recipient',
        phone: currentAddress.phone || '0901234567',
        city: currentAddress.city.trim(),
        district: currentAddress.district?.trim(),
        ward: currentAddress.ward?.trim(),
        street: currentAddress.street.trim() || 'Address',
      },
      itemIds: selectedItems.map((it) => String(it.id)),
    })
      .then((res) => {
        if (!isCancelled && typeof res?.totalShippingFee === 'number') {
          setDynamicShippingFee(res.totalShippingFee);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsCalculatingFee(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    selectedAddressId,
    currentAddress.city,
    currentAddress.district,
    currentAddress.ward,
    selectedItems.length,
  ]);

  const handleSaveNewAddress = async (addr: ShippingAddressInput) => {
    setCustomAddress(addr);
    showToast(t('checkout.addressSaved'));
    createAddress({ ...addr, isDefault: true })
      .then((created) => {
        if (created) {
          setAddresses((prev) => [created, ...prev]);
          setSelectedAddressId(created.id);
        }
      })
      .catch(() => {});
  };

  const handleConfirmCheckout = async () => {
    const { recipientName, phone, street, city, district, ward } = currentAddress;
    if (!recipientName.trim() || !phone.trim() || !street.trim()) {
      showToast(t('checkout.addressMissing'), 'error');
      return;
    }

    setIsProcessingOrder(true);
    const lockedTotal = computedGrandTotal;
    try {
      const res = await checkoutApi({
        shippingAddress: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          district: district?.trim() || undefined,
          ward: ward?.trim() || undefined,
          street: street.trim(),
        },
        shippingFee: actualShippingFee,
        paymentMethod,
        itemIds: selectedItems.map((it) => String(it.id)),
      });

      const orders = Array.isArray(res?.orders) ? res.orders : [];
      const ordersSum = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const finalAmount =
        ordersSum > 0 ? ordersSum : Number(res?.payosPayment?.amount) || lockedTotal;

      setCreatedOrders(orders);
      setPayosPayment(res?.payosPayment ?? null);
      setSuccessGrandTotal(finalAmount);
      setCheckoutSuccess(true);
      await clearCart();
      if (onCheckoutSuccess) onCheckoutSuccess();
    } catch (err: unknown) {
      console.error('Checkout failed:', err);
      showToast(getCheckoutErrorMessage(err, t('checkout.failed')), 'error');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleClose = () => {
    setCheckoutSuccess(false);
    setIsPaid(false);
    setSuccessGrandTotal(0);
    setDynamicShippingFee(null);
    onClose();
  };

  const modalTitle = getCheckoutModalTitle(checkoutSuccess, paymentMethod, isPaid, payosPayment, t);
  const submitButtonLabel = getCheckoutButtonLabel(isProcessingOrder, isCalculatingFee, t);

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size={checkoutSuccess ? 'lg' : 'xl'}
    >
      <div className="space-y-6 text-slate-800">
        {checkoutSuccess ? (
          <CheckoutSuccessCard
            orders={createdOrders}
            isCod={paymentMethod === 'COD'}
            payosPayment={payosPayment}
            grandTotal={successGrandTotal || computedGrandTotal}
            showToast={showToast}
            onPaymentCompleted={() => setIsPaid(true)}
            primaryAction={
              <Link
                to="/buyer/orders"
                onClick={handleClose}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800"
              >
                {t('checkout.viewMyOrders')}
              </Link>
            }
            secondaryAction={
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
              >
                {t('checkout.done')}
              </button>
            }
          />
        ) : (
          <div className="space-y-5">
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

            <CheckoutItemsSummary
              items={selectedItems}
              itemsSubtotal={itemsSubtotal}
              shippingFee={actualShippingFee}
              grandTotal={computedGrandTotal}
              isCalculatingFee={isCalculatingFee}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessingOrder}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                {t('checkout.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                disabled={isProcessingOrder || isCalculatingFee}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {(isProcessingOrder || isCalculatingFee) && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                <span>{submitButtonLabel}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
}
