import { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { MOCK_BUYER_DISPUTES, type BuyerDisputeReason, type BuyerDisputeStatus } from '../../mocks';

type DisputeStatus = BuyerDisputeStatus;
type DisputeReason = BuyerDisputeReason;

const mockDisputes = MOCK_BUYER_DISPUTES;

/* ─────────── Config ─────────── */
const statusConfig: Record<
  Exclude<DisputeStatus, 'ALL'>,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  OPEN: {
    label: 'Đang chờ xử lý',
    icon: <Clock size={11} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  UNDER_REVIEW: {
    label: 'Đang xem xét',
    icon: <AlertTriangle size={11} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  RESOLVED: {
    label: 'Đã giải quyết',
    icon: <CheckCircle size={11} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Bị từ chối',
    icon: <XCircle size={11} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
  },
};

const reasonLabels: Record<DisputeReason, string> = {
  NOT_RECEIVED: 'Không nhận được hàng',
  ITEM_DEFECTIVE: 'Sản phẩm bị lỗi / hư hỏng',
  WRONG_ITEM: 'Nhận sai sản phẩm',
  COUNTERFEIT: 'Nghi ngờ hàng giả',
  OTHER: 'Lý do khác',
};

const tabs: { key: DisputeStatus; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'OPEN', label: 'Đang chờ' },
  { key: 'UNDER_REVIEW', label: 'Đang xem xét' },
  { key: 'RESOLVED', label: 'Đã giải quyết' },
  { key: 'REJECTED', label: 'Bị từ chối' },
];

/* ─────────── New Dispute Form ─────────── */
function NewDisputeForm({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState<DisputeReason>('NOT_RECEIVED');
  const [orderId, setOrderId] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert size={14} className="text-red-500" />
          Mở khiếu nại mới
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <XCircle size={16} />
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Mã đơn hàng *</label>
        <input
          type="text"
          placeholder="VD: NX-20241020-001"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Lý do khiếu nại *</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as DisputeReason)}
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition appearance-none"
        >
          {Object.entries(reasonLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả chi tiết *</label>
        <textarea
          placeholder="Mô tả vấn đề bạn gặp phải một cách chi tiết…"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition resize-none"
        />
        <p className="text-[11px] text-slate-400 mt-1">{desc.length}/500 ký tự</p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Huỷ bỏ
        </button>
        <button
          type="button"
          className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition shadow-sm"
        >
          Gửi khiếu nại
        </button>
      </div>
    </div>
  );
}

/* ─────────── Main Component ─────────── */
export default function BuyerDisputesPage() {
  const [activeTab, setActiveTab] = useState<DisputeStatus>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = mockDisputes.filter((d) => activeTab === 'ALL' || d.status === activeTab);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-500" />
            Khiếu nại & Tranh chấp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý yêu cầu hoàn tiền và khiếu nại chất lượng
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3.5 py-2.5 rounded-xl transition shadow-sm"
        >
          <Plus size={13} />
          Mở khiếu nại
        </button>
      </div>

      {/* Notice */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3">
        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700 leading-relaxed">
          Khiếu nại có thể được mở trong vòng <strong>7 ngày</strong> kể từ khi nhận hàng hoặc khi
          đơn hàng quá hạn giao. Chúng tôi sẽ phản hồi trong <strong>24-48 giờ</strong>.
        </p>
      </div>

      {/* New Dispute Form */}
      {showForm && <NewDisputeForm onClose={() => setShowForm(false)} />}

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const count =
            tab.key === 'ALL'
              ? mockDisputes.length
              : mockDisputes.filter((d) => d.status === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-red-500 text-white shadow-sm shadow-red-500/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dispute List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <ShieldAlert size={36} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Không có khiếu nại nào</p>
          <p className="text-xs text-slate-400 mt-1">Mọi giao dịch đều đang ổn 🎉</p>
          <Link
            to="/buyer/orders"
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition"
          >
            <ShoppingBag size={13} />
            Xem đơn hàng
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((dispute) => {
            const s = statusConfig[dispute.status];
            const isExpanded = expandedId === dispute.id;

            return (
              <div
                key={dispute.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500">
                    #{dispute.id} • Đơn {dispute.orderId}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`}
                  >
                    {s.icon}
                    {s.label}
                  </span>
                </div>

                {/* Body */}
                <div className="flex items-start gap-4 px-4 py-4">
                  <div className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                    <img
                      src={dispute.img}
                      alt={dispute.product}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">
                      {dispute.product}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {reasonLabels[dispute.reason]}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs font-extrabold text-[#f24e1e]">
                        {dispute.amount.toLocaleString('vi-VN')} ₫
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                        <MessageSquare size={10} />
                        {dispute.messages} tin nhắn
                      </span>
                      <span className="text-[11px] text-slate-400">Mở {dispute.openDate}</span>
                    </div>
                    {dispute.resolution && (
                      <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                        <CheckCircle size={11} />
                        {dispute.resolution}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                    className="text-slate-400 hover:text-slate-600 transition p-1"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Expanded – Chat preview */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 text-center">
                      <MessageSquare size={20} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600 mb-1">
                        Kênh trao đổi với NEXUS Support
                      </p>
                      <p className="text-[11px]">
                        Nhân viên hỗ trợ sẽ liên hệ qua kênh này trong 24-48 giờ làm việc.
                      </p>
                      <button
                        type="button"
                        className="mt-3 flex items-center gap-1 mx-auto text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                      >
                        Mở hộp thoại chat <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
