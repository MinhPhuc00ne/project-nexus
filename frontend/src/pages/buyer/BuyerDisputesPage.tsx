import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

const statusConfig = {
  OPEN: {
    labelKey: 'disputesPage.status.open',
    icon: <Clock size={11} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  UNDER_REVIEW: {
    labelKey: 'disputesPage.status.underReview',
    icon: <AlertTriangle size={11} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  RESOLVED: {
    labelKey: 'disputesPage.status.resolved',
    icon: <CheckCircle size={11} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    labelKey: 'disputesPage.status.rejected',
    icon: <XCircle size={11} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
  },
} as const;

const tabs = [
  { key: 'ALL', labelKey: 'disputesPage.tabs.all' },
  { key: 'OPEN', labelKey: 'disputesPage.tabs.open' },
  { key: 'RESOLVED', labelKey: 'disputesPage.tabs.resolved' },
  { key: 'REJECTED', labelKey: 'disputesPage.tabs.rejected' },
] as const satisfies { key: BuyerDisputeStatus; labelKey: string }[];

export default function BuyerDisputesPage() {
  const { t } = useTranslation('buyer');
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
      showToast(t('disputesPage.preselectedOrderToast'));
    }
  }, [queryOrderId, t]);

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
            productName:
              o?.items?.[0]?.product?.title ||
              t('disputesPage.orderTitleFallback', { number: o?.orderNumber ?? '' }),
            img:
              o?.items?.[0]?.product?.thumbnail ||
              o?.items?.[0]?.product?.images?.[0]?.imageUrl ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
            amount: Number(o?.totalAmount ?? 0),
            reason: 'ITEM_DEFECTIVE',
            status: 'OPEN',
            createdAt: o?.updatedAt || o?.createdAt || '',
            updatedAt: o?.updatedAt || o?.createdAt || '',
            description: t('disputesPage.escrowMediationDesc'),
            sellerName: o?.seller?.fullName || t('disputesPage.defaultShopName'),
          }));
        setDisputes(mappedDisputes);
      }
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmitDispute = async () => {
    if (!selectedOrderId) {
      showToast(t('disputesPage.selectOrderError'));
      return;
    }
    if (!description.trim()) {
      showToast(t('disputesPage.enterDescriptionError'));
      return;
    }

    setSubmitting(true);
    try {
      await disputeOrderApi(selectedOrderId, `[${reasonLabels[reason]}] ${description.trim()}`);
      showToast(t('disputesPage.submitSuccessToast'));
      setShowCreateModal(false);
      setSelectedOrderId('');
      setDescription('');
      void loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('disputesPage.submitError');
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
            {t('disputesPage.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('disputesPage.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          {t('disputesPage.createButton')}
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
            {t(tab.labelKey)}
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
          <Loader2 size={16} className="animate-spin text-red-600" /> {t('disputesPage.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-400 mb-4">
            <ShieldAlert size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">{t('disputesPage.emptyTitle')}</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
            {t('disputesPage.emptyDesc')}
          </p>
          <Link
            to="/buyer/orders"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm"
          >
            <ShoppingBag size={14} />
            {t('disputesPage.viewOrdersButton')}
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
                    {t('disputesPage.orderNumberLabel', { number: d.orderNumber })}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}
                  >
                    {s.icon} {t(s.labelKey)}
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
