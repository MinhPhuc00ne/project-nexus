import { useCallback, useState, type ReactElement } from 'react';
import { BankOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getSellerRevenue } from '../../services/sellerFinance';
import useProductResource from '../../components/productDetail/useProductResource';
import { useSellerSession } from '../../components/seller/SellerSession';
import { PageHeading, Panel, SellerButton } from '../../components/seller/SellerUI';
import SellerResourceState from '../../components/seller/SellerResourceState';
import SellerFinanceSummary from '../../components/seller/SellerFinanceSummary';
import SellerFinanceHistory from '../../components/seller/SellerFinanceHistory';
import SellerWithdrawalModal from '../../components/seller/SellerWithdrawalModal';

export default function SellerFinancePage(): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  return <FinanceWorkspace key={`${user.id}:${token}`} />;
}

function FinanceWorkspace(): ReactElement {
  const user = useSellerSession();
  const { refreshProfile } = useAuth();
  const [revision, setRevision] = useState(0);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const load = useCallback(() => {
    void revision;
    return getSellerRevenue();
  }, [revision]);
  const revenue = useProductResource(load);
  function refresh(): void {
    setRevision((value) => value + 1);
  }
  function saved(): void {
    refresh();
    void refreshProfile();
  }
  const balance = revenue.data?.wallet.availableToWithdraw ?? 0;
  return (
    <div className="space-y-5">
      <PageHeading
        title="Tài chính & ví Escrow"
        description="Theo dõi doanh thu, quản lý dòng tiền và yêu cầu rút tiền về ngân hàng."
        actions={
          <>
            <SellerButton secondary onClick={refresh} disabled={revenue.loading}>
              <ReloadOutlined /> Làm mới
            </SellerButton>
            <SellerButton
              onClick={() => setWithdrawOpen(true)}
              disabled={
                revenue.loading ||
                !!revenue.error ||
                !revenue.data ||
                !!user.isShopSuspended ||
                balance < 50000
              }
            >
              <BankOutlined /> Yêu cầu rút tiền
            </SellerButton>
          </>
        }
      />
      {user.isShopSuspended && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Gian hàng đang bị đình chỉ. Bạn có thể xem lịch sử tài chính nhưng chưa thể gửi yêu cầu
          rút tiền.{user.suspensionReason ? ` Lý do: ${user.suspensionReason}` : ''}
        </p>
      )}
      <SellerResourceState loading={revenue.loading} error={revenue.error} retry={revenue.retry}>
        {revenue.data && <SellerFinanceSummary data={revenue.data} />}
      </SellerResourceState>
      {!revenue.loading && revenue.data && balance < 50000 && !user.isShopSuspended && (
        <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
          Số tiền rút tối thiểu là 50.000đ. Nút yêu cầu rút tiền sẽ khả dụng khi ví có đủ số dư.
        </p>
      )}
      <SellerFinanceHistory revision={revision} />
      <Panel
        title="Quy trình xử lý rút tiền"
        subtitle="Tiến độ được cập nhật trong mục Yêu cầu rút tiền"
      >
        <ol className="grid gap-4 text-xs sm:grid-cols-3">
          {[
            'Gửi yêu cầu với thông tin ngân hàng chính xác.',
            'Số tiền được tạm khóa để chờ Quản trị viên xét duyệt.',
            'Theo dõi trạng thái xử lý và kết quả trong lịch sử.',
          ].map((text, index) => (
            <li
              key={text}
              className="flex gap-3 rounded-xl bg-blue-50/60 p-4 leading-6 text-slate-600"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                {index + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </Panel>
      {withdrawOpen && (
        <SellerWithdrawalModal
          balance={balance}
          suspended={!!user.isShopSuspended}
          onClose={() => setWithdrawOpen(false)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
