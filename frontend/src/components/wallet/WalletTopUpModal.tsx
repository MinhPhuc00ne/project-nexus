import { Loader2, Building2 } from 'lucide-react';

interface WalletTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  topUpAmount: string;
  setTopUpAmount: (val: string) => void;
  selectedMethod: string;
  setSelectedMethod: (val: string) => void;
  onConfirm: () => void;
  submitting: boolean;
}

const topUpMethods = [
  { id: 'PAYOS', icon: Building2, label: 'PayOS VietQR', desc: 'Chuyển khoản QR ngân hàng 24/7' },
];

const quickAmounts = [200000, 500000, 1000000, 2000000];

export default function WalletTopUpModal({
  isOpen,
  onClose,
  topUpAmount,
  setTopUpAmount,
  selectedMethod,
  setSelectedMethod,
  onConfirm,
  submitting,
}: WalletTopUpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900 mb-1">Nạp tiền vào ví NEXUS</h3>
        <p className="text-xs text-slate-500 mb-4">Chọn số tiền và phương thức thanh toán</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setTopUpAmount(String(amt))}
              className={`rounded-xl border py-2 text-xs font-semibold transition ${
                topUpAmount === String(amt)
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              {amt.toLocaleString('vi-VN')} ₫
            </button>
          ))}
        </div>

        <input
          type="number"
          placeholder="Nhập số tiền khác (VNĐ)"
          value={topUpAmount}
          onChange={(e) => setTopUpAmount(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-orange-500 mb-4"
        />

        <div className="space-y-2 mb-5">
          <p className="text-xs font-bold text-slate-700">Phương thức nạp</p>
          {topUpMethods.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedMethod(m.id)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                selectedMethod === m.id
                  ? 'border-orange-500 bg-orange-50/50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <m.icon size={18} className="text-orange-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{m.label}</p>
                  <p className="text-[11px] text-slate-400">{m.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
            Xác nhận nạp
          </button>
        </div>
      </div>
    </div>
  );
}
