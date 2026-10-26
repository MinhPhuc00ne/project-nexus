import React from 'react';
import { QrCode, Truck, ShieldCheck } from 'lucide-react';

interface CheckoutPaymentMethodProps {
  paymentMethod: 'PAYOS' | 'WALLET' | 'STRIPE';
  onSelectPaymentMethod: (m: 'PAYOS' | 'WALLET' | 'STRIPE') => void;
  onShowNotice: (msg: string) => void;
}

export const CheckoutPaymentMethod: React.FC<CheckoutPaymentMethodProps> = ({
  paymentMethod,
  onSelectPaymentMethod,
  onShowNotice,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Phương thức thanh toán</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Lựa chọn 1: Thanh toán ngay */}
          <button
            type="button"
            onClick={() => onSelectPaymentMethod('PAYOS')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
              paymentMethod === 'PAYOS'
                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-blue-600" />
                <span className="font-bold text-xs text-slate-900">1. Thanh toán ngay</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                PayOS VietQR
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Quét mã QR qua app ngân hàng 24/7, tự động đối soát và tạm giữ bảo đảm tại NEXUS
              Escrow.
            </p>
          </button>

          {/* Lựa chọn 2: Thanh toán sau khi nhận hàng */}
          <button
            type="button"
            onClick={() => {
              onShowNotice(
                'Hiện tại sàn chỉ hỗ trợ Thanh toán ngay qua PayOS để bảo đảm ký quỹ Escrow.',
              );
            }}
            className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-left transition cursor-pointer hover:bg-slate-100/70 opacity-80"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-slate-500" />
                <span className="font-bold text-xs text-slate-700">
                  2. Thanh toán sau khi nhận hàng
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                COD (Sắp ra mắt)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Nhận hàng và thanh toán tiền mặt cho shipper. Đang tích hợp trong đợt cập nhật tiếp
              theo.
            </p>
          </button>
        </div>
      </div>

      {/* Escrow Guarantee Banner */}
      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3 text-xs text-indigo-900">
        <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold mb-0.5">Bảo chứng Ký quỹ NEXUS Escrow</h4>
          <p className="text-[11px] text-indigo-700 leading-relaxed">
            Khoản thanh toán được ký quỹ an toàn. Người bán chỉ được giải ngân sau khi bạn đã nhận
            hàng, kiểm định đồng hồ và hài lòng với chất lượng.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPaymentMethod;
