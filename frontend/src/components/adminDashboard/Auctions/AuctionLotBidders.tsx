import type { AuctionBidItem } from '../../../services/auction.service';
import { Badge, EmptyState } from '../shared/AdminUI';

type Props = {
  id: string;
  bids: AuctionBidItem[];
  leadingBidderId: string | null;
};

const bidLabels: Record<string, string> = {
  ACCEPTED: 'Hợp lệ',
  SUPERSEDED: 'Đã bị vượt giá',
  WINNING: 'Thắng đấu giá',
  REJECTED: 'Bị từ chối',
};

export default function AuctionLotBidders({ id, bids, leadingBidderId }: Props) {
  const rows = bids;
  const count = new Set(rows.map((bid) => bid.bidder.id)).size;

  return (
    <section
      id={id}
      aria-label="Lịch sử lượt đặt giá"
      className="space-y-3 rounded-xl border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-800">Lịch sử đặt giá</h3>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-600">
          {count} người · {rows.length} lượt đặt giá gần nhất
        </p>
      </div>
      <p className="text-xs text-slate-500">Hiển thị tối đa 20 lượt đặt giá gần nhất của lô.</p>
      {!rows.length ? (
        <EmptyState text="Lô chưa có lượt đặt giá." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Lịch sử đặt giá gần nhất của lô</caption>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="p-3">
                  Người đặt giá
                </th>
                <th scope="col" className="p-3">
                  Số tiền
                </th>
                <th scope="col" className="p-3">
                  Thời gian
                </th>
                <th scope="col" className="p-3">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((bid, index) => {
                const leading =
                  index === 0 && bid.bidder.id === leadingBidderId && bid.status !== 'REJECTED';
                return (
                  <tr key={bid.id} className={leading ? 'bg-blue-50/50' : undefined}>
                    <td className="min-w-36 p-3">
                      <p className="font-semibold text-slate-800">{bid.bidder.fullName}</p>
                      {leading && <span className="mt-1 block text-blue-600">Lượt dẫn đầu</span>}
                    </td>
                    <td className="whitespace-nowrap p-3 font-semibold text-primary">
                      {Number(bid.bidAmount).toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="whitespace-nowrap p-3 text-slate-500">
                      {new Date(bid.placedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      <Badge
                        tone={
                          bid.status === 'REJECTED'
                            ? 'red'
                            : bid.status === 'SUPERSEDED'
                              ? 'gray'
                              : 'green'
                        }
                      >
                        {bidLabels[bid.status] ?? bid.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
