import type { ReactElement } from 'react';
import {
  Landmark as BankOutlined,
  LineChart as LineChartOutlined,
  Lock as LockOutlined,
  WalletCards as WalletOutlined,
} from 'lucide-react';
import type { SellerRevenue } from '../../types/seller-finance.types';
import { EmptyState, Panel, StatCard } from './SellerUI';
import { financeMoney } from './financeFormat';

export default function SellerFinanceSummary({ data }: { data: SellerRevenue }): ReactElement {
  const { wallet, metrics } = data;
  const months = [...data.monthlyBreakdown].sort((a, b) => a.month.localeCompare(b.month));
  const maxGross = Math.max(1, ...months.map((item) => item.gross));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Có thể rút"
          value={financeMoney(wallet.availableToWithdraw)}
          detail="Số dư khả dụng trong ví"
          icon={<WalletOutlined />}
        />
        <StatCard
          label="Số dư đang khóa"
          value={financeMoney(wallet.lockedBalance)}
          detail="Theo thông tin ví trên hệ thống"
          icon={<LockOutlined />}
        />
        <StatCard
          label="Tổng doanh số"
          value={financeMoney(metrics.totalGrossRevenue)}
          detail={`${metrics.totalOrders} đơn hàng ghi nhận`}
          icon={<LineChartOutlined />}
        />
        <StatCard
          label="Doanh thu thuần ước tính"
          value={financeMoney(metrics.netRevenue)}
          detail={`Đã trừ phí sàn ước tính ${metrics.platformFeeRatePercentage}%`}
          icon={<BankOutlined />}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Doanh số theo tháng" subtitle="Các tháng có dữ liệu gần nhất, tối đa 6 tháng">
          {months.length ? (
            <div className="space-y-5">
              {months.map((item) => (
                <div key={item.month}>
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-slate-500">
                      {item.month} · {item.ordersCount} đơn
                    </span>
                    <strong className="font-semibold text-blue-700">
                      {financeMoney(item.gross)}
                    </strong>
                  </div>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-blue-50"
                    role="img"
                    aria-label={`${item.month}: ${financeMoney(item.gross)}`}
                  >
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.max(0, (item.gross / maxGross) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có doanh số"
              description="Doanh số sẽ được cập nhật khi gian hàng có đơn hàng."
            />
          )}
        </Panel>
        <Panel title="Đối soát doanh thu" subtitle="Doanh thu ước tính khác với số dư có thể rút">
          <dl className="divide-y divide-slate-100 text-xs">
            {[
              ['Đơn hoàn tất', String(metrics.completedOrdersCount)],
              ['Đơn đang xử lý', String(metrics.pendingOrdersCount)],
              ['Đơn hủy / hoàn tiền', String(metrics.cancelledOrdersCount)],
              ['Doanh thu đơn hoàn tất', financeMoney(metrics.completedRevenue)],
              ['Doanh thu đang chờ hoàn tất', financeMoney(metrics.pendingEscrowRevenue)],
              ['Phí sàn ước tính', financeMoney(metrics.estimatedPlatformFee)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="m-0 text-right font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </>
  );
}
