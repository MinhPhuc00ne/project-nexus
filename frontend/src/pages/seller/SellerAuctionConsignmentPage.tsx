import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { ApiRequestError } from '../../services/api';
import {
  getAuctionsApi,
  getSellerAuctionConsignmentsApi,
  type AuctionEntity,
  type SellerAuctionConsignment,
} from '../../services/auction.service';
import SellerConsignmentForm from '../../components/seller/SellerConsignmentForm';
import SellerConsignmentHistoryPanel from '../../components/seller/SellerConsignmentHistoryPanel';
import { PageHeading, Panel, SellerButton, SellerLink } from '../../components/seller/SellerUI';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return `${error.message} (HTTP ${error.status})`;
  return error instanceof Error ? error.message : 'Có lỗi không xác định. Vui lòng thử lại.';
}

/**
 * Seller auction consignment page allowing sellers to submit items and monitor appraisal progress.
 *
 * @returns Rendered auction consignment page layout.
 */
export default function SellerAuctionConsignmentPage(): ReactElement {
  const { notify } = useSellerWorkspace();
  const [auctions, setAuctions] = useState<AuctionEntity[]>([]);
  const [consignments, setConsignments] = useState<SellerAuctionConsignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const eligibleAuctions = useMemo(
    () =>
      auctions.filter((auction) => auction.status === 'SCHEDULED' || auction.status === 'ACTIVE'),
    [auctions],
  );

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
        title="Gửi vật phẩm vào đấu giá"
        description="Nộp ảnh, chứng thư thẩm định và mức giá đề xuất. Admin sẽ duyệt trước khi vật phẩm xuất hiện trong phiên."
        actions={
          <SellerLink secondary to="/seller/auctions">
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại đấu giá
          </SellerLink>
        }
      />

      {loadError && (
        <Panel
          title="Không tải được dữ liệu đấu giá"
          subtitle={loadError}
          action={
            <SellerButton secondary onClick={() => void loadData()}>
              <RefreshCw size={15} aria-hidden="true" />
              Thử lại
            </SellerButton>
          }
        >
          <p className="text-sm text-slate-500">
            Kiểm tra đăng nhập Seller và kết nối backend rồi thử lại.
          </p>
        </Panel>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <SellerConsignmentForm
          eligibleAuctions={eligibleAuctions}
          isLoading={isLoading}
          onSuccess={loadData}
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
