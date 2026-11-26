import { useCallback, useState, type ReactElement } from 'react';
import { RefreshCw as ReloadOutlined } from 'lucide-react';
import { FileText as FileTextOutlined } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getSellerDisputes } from '@/features/disputes/services/sellerDisputes';
import type { SellerDispute, SellerDisputeStatus } from '../../types/seller-dispute.types';
import useProductResource from '../../components/productDetail/useProductResource';
import { useSellerSession } from '../../components/seller/SellerSession';
import {
  Badge,
  EmptyState,
  PageHeading,
  Panel,
  SellerButton,
} from '../../components/seller/SellerUI';
import SellerResourceState from '../../components/seller/SellerResourceState';
import SellerDisputeResponse from '../../components/seller/SellerDisputeResponse';
import SellerPagination from '../../components/seller/SellerPagination';
import {
  canRespondDispute,
  disputeLabelKeys,
  getDisputeLabel,
} from '../../components/seller/orderPresentation';
import { financeDate, financeMoney } from '../../components/seller/financeFormat';

export default function SellerDisputesPage(): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  return <DisputesWorkspace key={`${user.id}:${token}`} />;
}
function DisputesWorkspace(): ReactElement {
  const { t } = useTranslation('seller');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SellerDisputeStatus | ''>('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<SellerDispute | null>(null);
  const refresh = (): void => setRevision((value) => value + 1);
  const load = useCallback(() => {
    void revision;
    return getSellerDisputes(page, status);
  }, [page, status, revision]);
  const resource = useProductResource(load);
  return (
    <div className="space-y-5">
      <PageHeading
        title={t('disputes.pageTitle')}
        description={t('disputes.pageDesc')}
        actions={
          <SellerButton secondary onClick={refresh} disabled={resource.loading}>
            <ReloadOutlined />
            {t('disputes.refresh')}
          </SellerButton>
        }
      />
      <Panel title={t('disputes.panelTitle')} subtitle={t('disputes.panelSubtitle')}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-blue-800">
            {resource.data &&
              [
                [t('disputes.counters.all'), resource.data.counters.all],
                [t('disputes.counters.open'), resource.data.counters.open],
                [t('disputes.counters.underReview'), resource.data.counters.underReview],
              ].map(([label, count]) => (
                <span className="rounded-lg bg-blue-50 px-3 py-2" key={label}>
                  {label}: <b>{count}</b>
                </span>
              ))}
          </div>
          <select
            aria-label={t('disputes.statusAria')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SellerDisputeStatus | '');
              setPage(1);
            }}
          >
            <option value="">{t('disputes.allStatuses')}</option>
            {Object.entries(disputeLabelKeys).map(([key, labelKey]) => (
              <option value={key} key={key}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </div>
        <SellerResourceState
          loading={resource.loading}
          error={resource.error}
          retry={resource.retry}
        >
          {resource.data && (
            <>
              {resource.data.items.length ? (
                <div className="space-y-4">
                  {resource.data.items.map((item) => (
                    <article key={item.id} className="rounded-xl border border-blue-100 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            to={`/seller/orders/${item.orderId}`}
                            className="text-xs font-semibold text-blue-700"
                          >
                            {t('disputes.orderNumber', { id: item.orderId.slice(0, 8) })}
                          </Link>
                          <p className="mt-2 text-xs text-slate-500">
                            {item.openedBy.fullName} · {financeDate(item.createdAt)}
                          </p>
                        </div>
                        <Badge tone={canRespondDispute(item.status) ? 'amber' : 'gray'}>
                          {getDisputeLabel(item.status)}
                        </Badge>
                      </div>
                      <p className="my-4 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                        {item.reason}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-500">
                          {item.order.items.map((product) => product.title).join(', ') ||
                            t('disputes.orderDetailFallback')}{' '}
                          · {financeMoney(item.order.totalAmount)}
                        </span>
                        <SellerButton secondary onClick={() => setSelected(item)}>
                          <FileTextOutlined />
                          {canRespondDispute(item.status)
                            ? t('disputes.respondBtn')
                            : t('disputes.viewCaseBtn')}
                        </SellerButton>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={t('disputes.emptyTitle')}
                  description={t('disputes.emptyDesc')}
                />
              )}
              <SellerPagination
                page={resource.data.page}
                totalPages={resource.data.totalPages}
                total={resource.data.total}
                onPage={setPage}
              />
            </>
          )}
        </SellerResourceState>
      </Panel>
      {selected && (
        <SellerDisputeResponse
          key={selected.id}
          dispute={selected}
          onClose={() => setSelected(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
