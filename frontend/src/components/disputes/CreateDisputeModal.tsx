import { Loader2 } from 'lucide-react';
import type { BuyerOrder } from '../../services/orders';
import type { BuyerDisputeReason } from '../../pages/buyer/BuyerDisputesPage';

export const reasonLabels: Record<BuyerDisputeReason, string> = {
  NOT_RECEIVED: 'Không nhận được hàng',
  ITEM_DEFECTIVE: 'Sản phẩm bị lỗi / hư hỏng',
  WRONG_ITEM: 'Nhận sai sản phẩm',
  COUNTERFEIT: 'Nghi ngờ hàng giả',
  OTHER: 'Lý do khác',
};

interface CreateDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: BuyerOrder[];
  selectedOrderId: string;
  setSelectedOrderId: (val: string) => void;
  reason: BuyerDisputeReason;
  setReason: (val: BuyerDisputeReason) => void;
  description: string;
  setDescription: (val: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export default function CreateDisputeModal({
  isOpen,
  onClose,
  orders,
  selectedOrderId,
  setSelectedOrderId,
  reason,
  setReason,
  description,
  setDescription,
  onSubmit,
  submitting,
}: CreateDisputeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900">Mở khiếu nại bảo vệ Escrow</h3>
        <p className="text-xs text-slate-500">
          Khoản thanh toán của đơn hàng sẽ bị tạm giữ, nhân viên hòa giải NEXUS sẽ thẩm định.
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Chọn đơn hàng cần khiếu nại
          </label>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-red-500 bg-white"
          >
            <option value="">-- Chọn đơn hàng --</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.orderNumber} - {Number(o.totalAmount).toLocaleString('vi-VN')} ₫ ({o.status})
              </option>
            ))}
            {selectedOrderId && !orders.some((o) => o.id === selectedOrderId) && (
              <option value={selectedOrderId}>Đơn hàng #{selectedOrderId}</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Lý do khiếu nại</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as BuyerDisputeReason)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-red-500 bg-white"
          >
            {Object.entries(reasonLabels).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Mô tả hiện trạng sản phẩm, biên bản đồng kiểm khi nhận hàng…"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
            Gửi khiếu nại
          </button>
        </div>
      </div>
    </div>
  );
}
