import type { ReactElement } from 'react';
import { LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import type { SellerAuctionConsignment } from '../../services/auction.service';
import { Badge, EmptyState, Panel, SellerButton } from './SellerUI';

export interface SellerConsignmentHistoryPanelProps {
  consignments: SellerAuctionConsignment[];
  isLoading: boolean;
  onRefresh: () => void;
}

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

function statusPresentation(status: SellerAuctionConsignment['status']): {
  label: string;
  tone: 'amber' | 'green' | 'red';
} {
  if (status === 'APPROVED') return { label: 'Đã được duyệt', tone: 'green' };
  if (status === 'REJECTED') return { label: 'Bị từ chối', tone: 'red' };
  return { label: 'Chờ Admin duyệt', tone: 'amber' };
}

/**
 * Renders the appraisal workflow explanation and list of seller submitted consignment items.
 *
 * @param props - Component configuration including consignment items and refresh callbacks.
 * @returns Rendered consignment history and guidance aside section.
 */
export default function SellerConsignmentHistoryPanel({
  consignments,
  isLoading,
  onRefresh,
}: SellerConsignmentHistoryPanelProps): ReactElement {
  return (
    <aside className="space-y-5">
      <Panel
        title="Quy trình phê duyệt"
        subtitle="Hồ sơ không được hiển thị công khai trước khi được duyệt."
      >
        <ol className="space-y-4 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              1
            </span>
            Seller gửi vật phẩm và chứng thư.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              2
            </span>
            Admin kiểm tra thông tin và chứng cứ.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              3
            </span>
            Vật phẩm được duyệt hoặc trả lý do từ chối.
          </li>
        </ol>
      </Panel>

      <Panel
        title="Hồ sơ đã gửi"
        subtitle="Trạng thái được lấy trực tiếp từ máy chủ."
        action={
          <SellerButton secondary onClick={onRefresh} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            Làm mới
          </SellerButton>
        }
      >
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <LoaderCircle className="animate-spin" size={18} />
            Đang tải hồ sơ…
          </div>
        ) : consignments.length === 0 ? (
          <EmptyState
            title="Chưa có hồ sơ ký gửi"
            description="Hồ sơ bạn gửi sẽ xuất hiện ở đây để theo dõi quyết định của Admin."
          />
        ) : (
          <div className="space-y-3">
            {consignments.map((item) => {
              const display = statusPresentation(item.status);
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.auction.title}</p>
                    </div>
                    <Badge tone={display.tone}>{display.label}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-blue-700">
                    {formatMoney(item.proposedStartingPrice)}
                  </p>
                  {item.status === 'REJECTED' && item.rejectionReason && (
                    <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs leading-5 text-rose-700">
                      Lý do: {item.rejectionReason}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        <ShieldCheck className="mb-2 text-blue-600" size={22} aria-hidden="true" />
        Admin sẽ đối chiếu mô tả, ảnh và chứng thư trước khi phê duyệt. Hãy dùng thông tin chính xác
        để tránh bị từ chối.
      </div>
    </aside>
  );
}
