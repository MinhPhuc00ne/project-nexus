import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getBuyerOrdersApi, disputeOrderApi, type BuyerOrder } from '../../services/orders';
import CreateDisputeModal, { reasonLabels } from '../../components/disputes/CreateDisputeModal';

export type BuyerDisputeStatus = 'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
export type BuyerDisputeReason =
  'NOT_RECEIVED' | 'ITEM_DEFECTIVE' | 'WRONG_ITEM' | 'COUNTERFEIT' | 'OTHER';

export interface BuyerDisputeItem {
  id: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  img: string;
  amount: number;
  reason: BuyerDisputeReason;
  status: Exclude<BuyerDisputeStatus, 'ALL'>;
  createdAt: string;
  updatedAt: string;
  description: string;
  sellerName: string;
}

const statusConfig: Record<
  Exclude<BuyerDisputeStatus, 'ALL'>,
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

const tabs: { key: BuyerDisputeStatus; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'OPEN', label: 'Đang xử lý' },
  { key: 'RESOLVED', label: 'Đã giải quyết' },
  { key: 'REJECTED', label: 'Bị từ chối' },
];

export default function BuyerDisputesPage() {
  const [searchParams] = useSearchParams();
  const queryOrderId = searchParams.get('orderId');

  const [disputes, setDisputes] = useState<BuyerDisputeItem[]>([]);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BuyerDisputeStatus>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(queryOrderId || '');
  const [reason, setReason] = useState<BuyerDisputeReason>('NOT_RECEIVED');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Tự động mở form khiếu nại và gán sẵn đơn hàng khi có orderId từ query param
  useEffect(() => {
    if (queryOrderId) {
      setSelectedOrderId(queryOrderId);
      setShowCreateModal(true);
      showToast('Đã chọn đơn hàng cần khiếu nại. Vui lòng nhập lý do và mô tả.');
    }
  }, [queryOrderId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await getBuyerOrdersApi();
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
        const mappedDisputes: BuyerDisputeItem[] = ordersData
          .filter((o) => o?.status === 'DISPUTED')
          .map((o) => ({
            id: `disp-${o.id}`,
            orderId: o.id,
            orderNumber: o.orderNumber ?? '',
            productName: o?.items?.[0]?.product?.title || `Đơn hàng #${o?.orderNumber ?? ''}`,
            img:
              o?.items?.[0]?.product?.thumbnail ||
              o?.items?.[0]?.product?.images?.[0]?.imageUrl ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
            amount: Number(o?.totalAmount ?? 0),
            reason: 'ITEM_DEFECTIVE',
            status: 'OPEN',
            createdAt: o?.updatedAt || o?.createdAt || '',
            updatedAt: o?.updatedAt || o?.createdAt || '',
            description: 'Đơn hàng đang trong quy trình hòa giải Escrow NEXUS',
            sellerName: o?.seller?.fullName || 'Gian Hàng NEXUS',
          }));
        setDisputes(mappedDisputes);
      }
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmitDispute = async () => {
    if (!selectedOrderId) {
      showToast('Vui lòng chọn đơn hàng cần khiếu nại.');
      return;
    }
    if (!description.trim()) {
      showToast('Vui lòng nhập mô tả chi tiết lý do khiếu nại.');
      return;
    }

    setSubmitting(true);
    try {
      await disputeOrderApi(selectedOrderId, `[${reasonLabels[reason]}] ${description.trim()}`);
      showToast('Đã gửi khiếu nại thành công! Tiền ký quỹ đã được phong tỏa để hòa giải.');
      setShowCreateModal(false);
      setSelectedOrderId('');
      setDescription('');
      void loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi khiếu nại.';
      showToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = disputes.filter((d) => activeTab === 'ALL' || d.status === activeTab);

  return (
    <div className="space-y-5">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[9999] rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white shadow-xl animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-500" />
            Khiếu nại & Tranh chấp Escrow
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bảo vệ quyền lợi người mua, bảo chứng giải ngân an toàn bởi NEXUS
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          Tạo khiếu nại mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === tab.key
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modal */}
      <CreateDisputeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        orders={orders}
        selectedOrderId={selectedOrderId}
        setSelectedOrderId={setSelectedOrderId}
        reason={reason}
        setReason={setReason}
        description={description}
        setDescription={setDescription}
        onSubmit={() => void handleSubmitDispute()}
        submitting={submitting}
      />

      {/* List */}
      {loading ? (
        <div className="py-14 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-red-600" /> Đang tải khiếu nại…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-400 mb-4">
            <ShieldAlert size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Chưa có khiếu nại nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
            Tất cả giao dịch của bạn đều diễn ra thuận lợi. Nếu có bất kỳ vấn đề nào về sản phẩm,
            bạn có thể mở khiếu nại để được hỗ trợ.
          </p>
          <Link
            to="/buyer/orders"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm"
          >
            <ShoppingBag size={14} />
            Xem danh sách đơn hàng
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const s = statusConfig[d.status] ?? statusConfig.OPEN;
            return (
              <div
                key={d.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">
                    Đơn hàng #{d.orderNumber}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}
                  >
                    {s.icon} {s.label}
                  </span>
                </div>
                <div className="pt-3 flex items-start gap-3">
                  <img
                    src={d.img}
                    alt={d.productName}
                    className="h-12 w-12 rounded-lg object-contain"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900">{d.productName}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{d.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
