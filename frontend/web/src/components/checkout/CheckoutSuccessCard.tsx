import React from 'react';
import { Truck, QrCode, Clock, Banknote, CreditCard } from 'lucide-react';
import type { BuyerOrder, PayosPaymentInfo } from '../../services/orders';
import PayosQrModal from './PayosQrModal';

export interface CheckoutSuccessCardProps {
  orders: BuyerOrder[];
  isCod: boolean;
  payosPayment: PayosPaymentInfo | null;
  grandTotal: number;
  showToast: (msg: string) => void;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export const CheckoutSuccessCard: React.FC<CheckoutSuccessCardProps> = ({
  orders,
  isCod,
  payosPayment,
  grandTotal,
  showToast,
  primaryAction,
  secondaryAction,
}) => {
  const orderCodes = orders
    .map((o) => o.orderNumber)
    .filter(Boolean)
    .join(', ');

  const renderIcon = () => {
    if (isCod) {
      return (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <Truck size={34} />
        </div>
      );
    }
    if (payosPayment) {
      return (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner">
          <QrCode size={34} />
        </div>
      );
    }
    return (
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
        <Clock size={34} />
      </div>
    );
  };

  const renderHeader = () => {
    if (isCod) {
      return (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            Đặt Hàng COD Thành Công!
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {orderCodes
              ? `Mã đơn hàng: ${orderCodes}`
              : 'Đơn hàng của bạn đã được tiếp nhận và thông báo cho người bán chuẩn bị.'}
          </p>
        </div>
      );
    }
    if (payosPayment) {
      return (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            Khởi Tạo Đơn Hàng Thành Công!
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {orderCodes
              ? `Mã đơn hàng: ${orderCodes} • Quét mã PayOS VietQR để thanh toán`
              : 'Vui lòng quét mã VietQR bên dưới bằng ứng dụng ngân hàng để thanh toán.'}
          </p>
        </div>
      );
    }
    return (
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Đặt Hàng Thành Công!</h2>
        <p className="mt-1 text-xs text-slate-500">
          {orderCodes
            ? `Mã đơn hàng: ${orderCodes} • Trạng thái: Chờ thanh toán`
            : 'Đơn hàng đã được lưu trên hệ thống và đang chờ thanh toán.'}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-center text-slate-800">
      {renderIcon()}
      {renderHeader()}

      {isCod ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left text-xs sm:p-5">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="text-emerald-700" size={20} />
              <span className="font-bold text-emerald-950">
                Số tiền cần thanh toán khi nhận hàng:
              </span>
            </div>
            <span className="text-base font-black text-[#f24e1e] sm:text-lg">
              {grandTotal.toLocaleString('vi-VN')} ₫
            </span>
          </div>

          <div className="space-y-2 pt-1 text-[11px] leading-relaxed text-emerald-900">
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-700">•</span>
              <span>
                <strong>Hình thức:</strong> Thanh toán tiền mặt trực tiếp cho nhân viên giao hàng
                GHN Express.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-700">•</span>
              <span>
                <strong>Chuẩn bị:</strong> Quý khách vui lòng chuẩn bị số tiền mặt tương ứng khi bưu
                tá liên hệ phát hàng.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-700">•</span>
              <span>
                <strong>Quyền lợi đồng kiểm:</strong> Bạn được kiểm tra bao bì và kiện hàng trước
                khi thanh toán tiền mặt.
              </span>
            </div>
          </div>
        </div>
      ) : payosPayment ? (
        <PayosQrModal payment={payosPayment} onCopySuccess={showToast} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 text-left text-xs">
          <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-blue-700" size={20} />
              <span className="font-bold text-blue-950">Phương thức: PayOS VietQR</span>
            </div>
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              Chờ thanh toán
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Tổng tiền đơn hàng:</span>
            <span className="text-base font-extrabold text-[#f24e1e]">
              {grandTotal.toLocaleString('vi-VN')} ₫
            </span>
          </div>
          <p className="pt-1 text-[11px] leading-relaxed text-blue-900">
            Đơn hàng đã được tạo thành công trên hệ thống. Quý khách có thể vào mục{' '}
            <strong>"Xem đơn hàng của tôi"</strong> để quét mã QR PayOS hoặc kiểm tra tiến trình
            đơn.
          </p>
        </div>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

export default CheckoutSuccessCard;
