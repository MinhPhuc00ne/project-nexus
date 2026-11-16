import React, { useState } from 'react';
import { X, AlertCircle, Send, Loader2 } from 'lucide-react';
import { createAuctionComplaintApi } from '../../services/auction.service';
import { useToast } from '../ToastNotification/useToast';

/**
 * Props for the buyer auction complaint modal.
 */
interface AuctionComplaintModalProps {
  auctionId: string;
  auctionItemId?: string | null;
  lotTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal enabling a buyer to submit an auction or lot complaint to platform administrators.
 *
 * @param props - Component props specifying target auction, lot context, and modal callbacks.
 * @returns Rendered complaint modal or null when closed.
 */
export default function AuctionComplaintModal({
  auctionId,
  auctionItemId,
  lotTitle,
  isOpen,
  onClose,
  onSuccess,
}: AuctionComplaintModalProps): React.ReactElement | null {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do và nội dung khiếu nại.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await createAuctionComplaintApi(auctionId, {
        auctionItemId: auctionItemId || undefined,
        reason: reason.trim(),
      });
      toast.success('Đã gửi khiếu nại thành công! Ban Quản trị sẽ tiếp nhận và phản hồi sớm nhất.');
      setReason('');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể gửi khiếu nại. Vui lòng thử lại sau.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500 text-white shadow-xs">
              <AlertCircle size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gửi khiếu nại phiên đấu giá lên Admin
              </h3>
              <p className="text-[11px] text-slate-500">
                Nexus tiếp nhận và xử lý minh bạch mọi khiếu nại và vi phạm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {lotTitle && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Hiện vật liên quan:</span>{' '}
              <strong className="text-slate-900">{lotTitle}</strong>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              Nội dung khiếu nại chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mô tả chi tiết sự việc, lý do không đồng ý với quyết định quá hạn hoặc sự cố thanh toán..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none placeholder:text-slate-400"
              maxLength={2000}
            />
            <p className="text-[10px] text-slate-400 text-right">{reason.length}/2000 ký tự</p>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Đang gửi...
                </>
              ) : (
                <>
                  <Send size={13} /> Gửi khiếu nại
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
