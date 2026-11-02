import React from 'react';
import { QrCode, Truck, ShieldCheck, Banknote } from 'lucide-react';
import type { CheckoutPaymentMethodType } from '../../services/orders';

interface CheckoutPaymentMethodProps {
  paymentMethod: CheckoutPaymentMethodType;
  onSelectPaymentMethod: (m: CheckoutPaymentMethodType) => void;
  onShowNotice?: (msg: string) => void;
}

export const CheckoutPaymentMethod: React.FC<CheckoutPaymentMethodProps> = ({
  paymentMethod,
  onSelectPaymentMethod,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Phương thức thanh toán</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Lựa chọn 1: Thanh toán ngay qua PayOS */}
          <button
            type="button"
            onClick={() => onSelectPaymentMethod('PAYOS')}
            className={`cursor-pointer rounded-xl border p-3.5 text-left transition ${
              paymentMethod === 'PAYOS'
                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-900">1. Thanh toán ngay</span>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                PayOS VietQR
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Quét mã QR qua app ngân hàng 24/7, tự động đối soát và tạm giữ bảo đảm tại NEXUS
              Escrow.
            </p>
          </button>

          {/* Lựa chọn 2: Thanh toán sau khi nhận hàng (COD) */}
          <button
            type="button"
            onClick={() => onSelectPaymentMethod('COD')}
            className={`cursor-pointer rounded-xl border p-3.5 text-left transition ${
              paymentMethod === 'COD'
                ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote
                  size={18}
                  className={paymentMethod === 'COD' ? 'text-emerald-600' : 'text-slate-600'}
                />
                <span className="text-xs font-bold text-slate-900">
                  2. Thanh toán sau khi nhận hàng
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  paymentMethod === 'COD'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                COD Tiền mặt
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Đồng kiểm và thanh toán tiền mặt trực tiếp cho nhân viên giao hàng khi nhận bưu phẩm.
            </p>
          </button>
        </div>
      </div>

      {/* Thông tin bảo chứng theo phương thức đã chọn */}
      {paymentMethod === 'COD' ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
          <Truck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="mb-0.5 font-bold text-emerald-900">
              Giao hàng & Thu tiền tận nơi (COD GHN Express)
            </h4>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Quý khách vui lòng chuẩn bị sẵn số tiền mặt tương ứng khi shipper liên hệ phát hàng.
              Bạn hoàn toàn được kiểm tra bưu kiện nguyên vẹn trước khi thanh toán tiền mặt.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-900">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-indigo-600" />
          <div>
            <h4 className="mb-0.5 font-bold">Bảo chứng Ký quỹ NEXUS Escrow</h4>
            <p className="text-[11px] leading-relaxed text-indigo-700">
              Khoản thanh toán được ký quỹ an toàn. Người bán chỉ được giải ngân sau khi bạn đã nhận
              hàng, kiểm định sản phẩm và xác nhận hài lòng với chất lượng.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPaymentMethod;
