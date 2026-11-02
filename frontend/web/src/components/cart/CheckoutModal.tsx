import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Popup from '../Popup';
import { clearCart, type CartItem } from '../../services/cart';
import { getStoredToken } from '../../services/auth';
import { getAddresses, createAddress, type UserAddress } from '../../services/address';
import {
  checkoutApi,
  type PayosPaymentInfo,
  type BuyerOrder,
  type ShippingAddressInput,
  type CheckoutPaymentMethodType,
} from '../../services/orders';
import { Loader2 } from 'lucide-react';
import CheckoutSuccessCard from '../checkout/CheckoutSuccessCard';
import CheckoutAddressSection from '../checkout/CheckoutAddressSection';
import CheckoutPaymentMethod from '../checkout/CheckoutPaymentMethod';

export type DeliveryAddress = ShippingAddressInput;

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  shippingFee?: number;
  grandTotal?: number;
  onCheckoutSuccess?: () => void;
  showToast: (msg: string) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  selectedItems,
  shippingFee,
  grandTotal,
  onCheckoutSuccess,
  showToast,
}: CheckoutModalProps) {
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

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethodType>('PAYOS');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [payosPayment, setPayosPayment] = useState<PayosPaymentInfo | null>(null);
  const [createdOrders, setCreatedOrders] = useState<BuyerOrder[]>([]);

  const itemsSubtotal = selectedItems.reduce((sum, it) => sum + it.price * it.qty, 0);
  const actualShippingFee = shippingFee !== undefined ? shippingFee : 30000;
  const computedGrandTotal =
    grandTotal !== undefined ? grandTotal : itemsSubtotal + actualShippingFee;

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
      .catch(() => {
        // ignore
      });
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

  const handleSaveNewAddress = async (addr: ShippingAddressInput) => {
    setCustomAddress(addr);
    showToast('Đã lưu và cập nhật địa chỉ giao hàng.');
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
    } catch {
      // ignore
    }
  };

  const handleConfirmCheckout = async () => {
    const { recipientName, phone, street, city, district, ward } = currentAddress;
    if (!recipientName.trim() || !phone.trim() || !street.trim()) {
      showToast('Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng.');
      return;
    }

    setIsProcessingOrder(true);
    try {
      const res = await checkoutApi({
        shippingAddress: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          district: district ? district.trim() : undefined,
          ward: ward ? ward.trim() : undefined,
          street: street.trim(),
        },
        shippingFee: actualShippingFee,
        paymentMethod,
        itemIds: selectedItems.map((it) => String(it.id)),
      });

      setCreatedOrders(Array.isArray(res?.orders) ? res.orders : []);
      setPayosPayment(res?.payosPayment ?? null);
      setCheckoutSuccess(true);
      await clearCart();
      if (onCheckoutSuccess) onCheckoutSuccess();
    } catch (err: unknown) {
      console.error('Checkout failed:', err);
      const resData = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data;
      const serverMsg = resData?.message;
      const msg = Array.isArray(serverMsg)
        ? serverMsg.join(', ')
        : typeof serverMsg === 'string'
          ? serverMsg
          : err instanceof Error
            ? err.message
            : 'Thanh toán thất bại. Vui lòng thử lại!';
      showToast(msg);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleClose = () => {
    setCheckoutSuccess(false);
    onClose();
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleClose}
      title={
        checkoutSuccess
          ? paymentMethod === 'COD'
            ? 'Đặt Hàng COD Thành Công'
            : payosPayment
              ? 'Quét Mã PayOS Để Thanh Toán'
              : 'Đặt Hàng Thành Công'
          : 'Xác Nhận Đặt Hàng & Thanh Toán'
      }
      size={checkoutSuccess ? 'lg' : 'xl'}
    >
      <div className="space-y-6 text-slate-800">
        {checkoutSuccess ? (
          <CheckoutSuccessCard
            orders={createdOrders}
            isCod={paymentMethod === 'COD'}
            payosPayment={payosPayment}
            grandTotal={computedGrandTotal}
            showToast={showToast}
            primaryAction={
              <Link
                to="/buyer/orders"
                onClick={handleClose}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow transition hover:bg-slate-800"
              >
                <span>Xem đơn hàng của tôi</span>
              </Link>
            }
            secondaryAction={
              <button
                type="button"
                onClick={handleClose}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-700"
              >
                <span>Hoàn tất</span>
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

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-800 pb-2 border-b border-slate-200">
                <span>Sản phẩm thanh toán ({selectedItems.length})</span>
                <span>Thành tiền</span>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                {selectedItems.map((item) => (
                  <div key={item.id} className="py-2 flex justify-between items-center gap-3">
                    <span className="line-clamp-1 flex-1 font-medium text-slate-700">
                      {item.name} <span className="text-slate-400">x{item.qty}</span>
                    </span>
                    <span className="font-bold text-slate-900 shrink-0">
                      {(item.price * item.qty).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-200 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Tiền hàng:</span>
                  <span className="font-semibold text-slate-800">
                    {itemsSubtotal.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển GHN:</span>
                  <span className="font-semibold text-slate-800">
                    {actualShippingFee === 0 ? (
                      <span className="text-emerald-600 font-bold">MIỄN PHÍ</span>
                    ) : (
                      `${actualShippingFee.toLocaleString('vi-VN')} ₫`
                    )}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold">
                <span className="text-slate-700">Tổng thanh toán:</span>
                <span className="text-base text-blue-600 font-extrabold">
                  {computedGrandTotal.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessingOrder}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                disabled={isProcessingOrder}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessingOrder ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang xử lý đơn hàng...</span>
                  </>
                ) : (
                  <span>Xác nhận đặt hàng</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
}
