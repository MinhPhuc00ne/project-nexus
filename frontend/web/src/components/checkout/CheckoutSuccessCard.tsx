import React from 'react';
import { CheckCircle2, Banknote, Truck, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="space-y-6 text-center text-slate-800">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
        {isCod ? <Truck size={34} /> : <CheckCircle2 size={36} />}
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
          {isCod ? 'Đặt Hàng COD Thành Công!' : 'Thanh Toán Thành Công!'}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {orderCodes
            ? `Mã đơn hàng: ${orderCodes}`
            : isCod
              ? 'Đơn hàng của bạn đã được tiếp nhận và thông báo cho người bán chuẩn bị.'
              : 'Đơn hàng của bạn đã được thanh toán và bảo chứng bởi NEXUS Escrow.'}
        </p>
      </div>

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
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-xs leading-relaxed text-emerald-900">
          <ShieldCheck size={20} className="shrink-0 text-emerald-600" />
          <span>
            Đơn hàng đã được thanh toán thành công và bảo chứng an toàn qua hệ thống NEXUS Escrow.
          </span>
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
