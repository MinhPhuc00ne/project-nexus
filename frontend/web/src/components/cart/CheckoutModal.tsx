import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Popup from '../Popup';
import { clearCart, type CartItem } from '../../services/cart';
import { getStoredToken } from '../../services/auth';
import { getAddresses, createAddress, type UserAddress } from '../../services/address';
import {
  checkoutApi,
  type PayosPaymentInfo,
  type BuyerOrder,
  type ShippingAddressInput,
} from '../../services/orders';
import { CheckCircle2, ShoppingBag, Loader2 } from 'lucide-react';
import PayosQrModal from '../checkout/PayosQrModal';
import CheckoutAddressSection from '../checkout/CheckoutAddressSection';
import CheckoutPaymentMethod from '../checkout/CheckoutPaymentMethod';

export type DeliveryAddress = ShippingAddressInput;

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  grandTotal: number;
  onCheckoutSuccess?: () => void;
  showToast: (msg: string) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  selectedItems,
  grandTotal,
  onCheckoutSuccess,
  showToast,
}: CheckoutModalProps) {
  const navigate = useNavigate();

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

  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'WALLET' | 'STRIPE'>('PAYOS');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [payosPayment, setPayosPayment] = useState<PayosPaymentInfo | null>(null);
  const [createdOrders, setCreatedOrders] = useState<BuyerOrder[]>([]);

  useEffect(() => {
    if (!isOpen || !getStoredToken()) return;
    getAddresses()
      .then((list) => {
        if (list && list.length > 0) {
          setAddresses(list);
          const def = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(def.id);
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
    if (
      !currentAddress.recipientName.trim() ||
      !currentAddress.phone.trim() ||
      !currentAddress.street.trim()
    ) {
      showToast('Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng.');
      return;
    }

    setIsProcessingOrder(true);
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
        itemIds: selectedItems.map((it) => String(it.id)),
      });

      setCreatedOrders(res.orders || []);
      setPayosPayment(res.payosPayment || null);
      setCheckoutSuccess(true);
      await clearCart();
      if (onCheckoutSuccess) onCheckoutSuccess();
    } catch (err: unknown) {
      console.error('Checkout failed:', err);
      const msg = err instanceof Error ? err.message : 'Thanh toán thất bại. Vui lòng thử lại!';
      showToast(msg);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => {
        if (checkoutSuccess) {
          navigate('/buyer/orders');
        }
        onClose();
      }}
      title={checkoutSuccess ? 'Thanh Toán Thành Công' : 'Xác Nhận Đặt Hàng & Thanh Toán'}
      size={checkoutSuccess ? 'lg' : 'xl'}
    >
      <div className="space-y-6 text-slate-800">
        {checkoutSuccess ? (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Đặt Hàng Thành Công!</h2>
              <p className="text-xs text-slate-500 mt-1">
                {createdOrders.length > 0
                  ? `Mã đơn hàng: ${createdOrders.map((o) => o.orderNumber).join(', ')}`
                  : 'Đơn hàng của bạn đã được ghi nhận và đưa vào cơ chế bảo chứng NEXUS Escrow.'}
              </p>
            </div>

            {payosPayment ? (
              <PayosQrModal payment={payosPayment} onCopySuccess={showToast} />
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs leading-relaxed">
                Đơn hàng đã được lưu trữ trong danh sách đơn mua của bạn.
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/buyer/orders"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow flex items-center gap-1.5"
              >
                <ShoppingBag size={14} />
                <span>Xem Đơn Hàng Của Tôi</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
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
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
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
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold">
                <span className="text-slate-700">Tổng thanh toán:</span>
                <span className="text-base text-blue-600 font-extrabold">
                  {grandTotal.toLocaleString('vi-VN')} ₫
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
