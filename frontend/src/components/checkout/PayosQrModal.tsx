import React from 'react';
import { QrCode, Copy, ExternalLink } from 'lucide-react';
import type { PayosPaymentInfo } from '../../services/orders';

interface PayosQrModalProps {
  payment: PayosPaymentInfo;
  onCopySuccess?: (msg: string) => void;
}

export const PayosQrModal: React.FC<PayosQrModalProps> = ({ payment, onCopySuccess }) => {
  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    if (onCopySuccess) {
      onCopySuccess(`Đã sao chép ${label}!`);
    }
  };

  const qrImageUrl =
    payment.qrCode && (payment.qrCode.startsWith('http') || payment.qrCode.startsWith('data:'))
      ? payment.qrCode
      : `https://api.vietqr.io/image/${payment.bin}-${payment.accountNumber}-compact.png?amount=${payment.amount}&addInfo=${encodeURIComponent(
          payment.description || '',
        )}&accountName=${encodeURIComponent(payment.accountName || '')}`;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 text-left shadow-lg border border-indigo-900/50">
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2">
          <QrCode className="text-emerald-400" size={22} />
          <span className="font-bold text-sm text-white">Thanh Toán PayOS VietQR 24/7</span>
        </div>
        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Tự Động Kích Hoạt
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center shadow">
          {payment.qrCode || (payment.bin && payment.accountNumber) ? (
            <img src={qrImageUrl} alt="PayOS VietQR" className="w-48 h-48 object-contain" />
          ) : (
            <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
              <QrCode size={48} className="mb-2 text-slate-300" />
              <span>Quét mã qua link PayOS</span>
            </div>
          )}
          <span className="text-[11px] text-slate-500 mt-2 font-semibold">
            Mở app ngân hàng để quét mã
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {payment.accountName && (
            <div>
              <span className="text-slate-400 text-[11px] block">Người thụ hưởng:</span>
              <strong className="text-white text-sm">{payment.accountName}</strong>
            </div>
          )}
          {payment.accountNumber && (
            <div>
              <span className="text-slate-400 text-[11px] block">Số tài khoản:</span>
              <div className="flex items-center gap-2">
                <strong className="text-emerald-400 font-mono text-base tracking-wider">
                  {payment.accountNumber}
                </strong>
                <button
                  type="button"
                  onClick={() => copyToClipboard(payment.accountNumber!, 'Số tài khoản')}
                  className="text-slate-400 hover:text-white transition"
                  title="Sao chép số tài khoản"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}
          <div>
            <span className="text-slate-400 text-[11px] block">Số tiền cần thanh toán:</span>
            <strong className="text-amber-400 text-base font-extrabold">
              {Number(payment.amount).toLocaleString('vi-VN')} ₫
            </strong>
          </div>
          {payment.description && (
            <div>
              <span className="text-slate-400 text-[11px] block">Nội dung chuyển khoản:</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-200 font-mono bg-white/10 px-2 py-0.5 rounded text-xs break-all">
                  {payment.description}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(payment.description!, 'Nội dung chuyển khoản')}
                  className="text-slate-400 hover:text-white transition"
                  title="Sao chép nội dung"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {payment.checkoutUrl && (
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-300">Hoặc mở trang thanh toán chính thức:</span>
          <a
            href={payment.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
          >
            <span>Mở Cổng PayOS</span>
            <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
};

export default PayosQrModal;
