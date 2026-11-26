import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import i18n from '../../i18n/index';
import { ApiRequestError } from '../../services/api';
import {
  getAuctionsApi,
  getSellerAuctionConsignmentsApi,
  type AuctionEntity,
  type SellerAuctionConsignment,
} from '@/features/auction/services/auction.service';
import SellerConsignmentForm from '../../components/seller/SellerConsignmentForm';
import SellerConsignmentHistoryPanel from '../../components/seller/SellerConsignmentHistoryPanel';
import { canSubmitConsignment } from '../../components/seller/sellerConsignmentHelpers';
import { PageHeading, Panel, SellerButton, SellerLink } from '../../components/seller/SellerUI';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return `${error.message} (HTTP ${error.status})`;
  return error instanceof Error
    ? error.message
    : i18n.t('auctions.consignment.unknownErr', { ns: 'seller' });
}

/**
 * Seller auction consignment page allowing sellers to submit items and monitor appraisal progress.
 *
 * @returns Rendered auction consignment page layout.
 */
export default function SellerAuctionConsignmentPage(): ReactElement {
  const { t } = useTranslation('seller');
  const { notify } = useSellerWorkspace();
  const [searchParams] = useSearchParams();
  const [auctions, setAuctions] = useState<AuctionEntity[]>([]);
  const [consignments, setConsignments] = useState<SellerAuctionConsignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const eligibleAuctions = useMemo(() => auctions.filter(canSubmitConsignment), [auctions]);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [auctionResponse, submittedItems] = await Promise.all([
        getAuctionsApi({ limit: 50 }),
        getSellerAuctionConsignmentsApi(),
      ]);
      setAuctions(auctionResponse.items);
      setConsignments(submittedItems);
    } catch (error) {
      const message = getErrorMessage(error);
      setLoadError(message);
      notify(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="flex flex-col gap-5" data-seller="page-stack">
      <PageHeading
        title={t('auctions.consignment.pageTitle')}
        description={t('auctions.consignment.pageDesc')}
        actions={
          <SellerLink secondary to="/seller/auctions">
            <ArrowLeft size={16} aria-hidden="true" />
            {t('auctions.consignment.backToAuctions')}
          </SellerLink>
        }
      />

      {loadError && (
        <Panel
          title={t('auctions.consignment.loadErrTitle')}
          subtitle={loadError}
          action={
            <SellerButton secondary onClick={() => void loadData()}>
              <RefreshCw size={15} aria-hidden="true" />
              {t('auctions.consignment.retry')}
            </SellerButton>
          }
        >
          <p className="text-sm text-slate-500">{t('auctions.consignment.loadErrHint')}</p>
        </Panel>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <SellerConsignmentForm
          eligibleAuctions={eligibleAuctions}
          isLoading={isLoading}
          onSuccess={loadData}
          preselectedAuctionId={searchParams.get('auctionId') ?? undefined}
        />
        <SellerConsignmentHistoryPanel
          consignments={consignments}
          isLoading={isLoading}
          onRefresh={() => void loadData()}
        />
      </div>
    </div>
  );
}
