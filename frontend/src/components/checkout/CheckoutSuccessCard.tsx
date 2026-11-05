import React, { useState, useEffect } from 'react';
import { Truck, QrCode, Clock, Banknote, CreditCard, CheckCircle2 } from 'lucide-react';
import {
  checkPaymentStatusApi,
  type BuyerOrder,
  type PayosPaymentInfo,
} from '../../services/orders';
import PayosQrModal from './PayosQrModal';

export interface CheckoutSuccessCardProps {
  orders: BuyerOrder[];
  isCod: boolean;
  payosPayment: PayosPaymentInfo | null;
  grandTotal: number;
  showToast: (msg: string) => void;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  onPaymentCompleted?: () => void;
}

export const CheckoutSuccessCard: React.FC<CheckoutSuccessCardProps> = ({
  orders,
  isCod,
  payosPayment,
  grandTotal,
  showToast,
  primaryAction,
  secondaryAction,
  onPaymentCompleted,
}) => {
  const [isPaid, setIsPaid] = useState(false);
  const targetOrderId = payosPayment?.orderId || orders[0]?.id;

  useEffect(() => {
    if (!targetOrderId || isCod || isPaid || !payosPayment) return;
    let isCancelled = false;

    const checkStatus = async () => {
      try {
        const res = await checkPaymentStatusApi(targetOrderId);
        if (!isCancelled && res.paid) {
          setIsPaid(true);
          showToast('Thanh toán đơn hàng qua PayOS VietQR thành công!');
          if (onPaymentCompleted) onPaymentCompleted();
        }
      } catch {
        // Polling failure can be ignored silently to retry on next tick
      }
    };

    const intervalId = window.setInterval(() => {
      void checkStatus();
    }, 2500);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [targetOrderId, isCod, isPaid, payosPayment, showToast, onPaymentCompleted]);

  const orderCodes = orders
    .map((o) => o.orderNumber)
    .filter(Boolean)
    .join(', ');

  const renderIcon = () => {
    if (isPaid) {
      return (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <CheckCircle2 size={36} className="text-emerald-600" />
        </div>
      );
    }
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
    if (isPaid) {
      return (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            Thanh Toán Thành Công!
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {orderCodes
              ? `Mã đơn hàng: ${orderCodes} • Đã ghi nhận ký quỹ an toàn`
              : 'Đơn hàng của bạn đã được thanh toán và lưu vào hệ thống ký quỹ NEXUS Escrow.'}
          </p>
        </div>
      );
    }
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
              {Number(grandTotal || 0).toLocaleString('vi-VN')} ₫
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
      ) : isPaid ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-left text-xs">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-emerald-700" size={20} />
              <span className="font-bold text-emerald-950">Phương thức: PayOS VietQR 24/7</span>
            </div>
            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-0.5 text-[11px] font-extrabold text-emerald-800">
              Đã thanh toán
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Số tiền đã thanh toán:</span>
            <span className="text-base font-black text-emerald-700">
              {Number(grandTotal || 0).toLocaleString('vi-VN')} ₫
            </span>
          </div>
          <div className="space-y-1.5 pt-1 text-[11px] leading-relaxed text-emerald-900">
            <p>
              • Tiền thanh toán của bạn đang được giữ ký quỹ an toàn tại{' '}
              <strong>NEXUS Escrow</strong>.
            </p>
            <p>
              • Người bán đã nhận được đơn hàng và đang tiến hành đóng gói để giao cho GHN Express.
            </p>
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
              {Number(grandTotal || 0).toLocaleString('vi-VN')} ₫
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
