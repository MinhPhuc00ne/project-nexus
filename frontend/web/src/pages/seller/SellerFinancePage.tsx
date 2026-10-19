import {
  QuestionCircleOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useSellerSession } from '../../components/seller/SellerSession';
import {
  Badge,
  EmptyState,
  PageHeading,
  Panel,
  PolicyCards,
  StatCard,
} from '../../components/seller/SellerUI';
import { money, trustLabels } from '../../components/seller/sellerData';

export default function SellerFinancePage() {
  const user = useSellerSession();
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title="Tài chính & ví Escrow"
        description="An tâm giao dịch. Minh bạch từng khoản thu."
      />
      <div
        className="grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-4 min-[1600px]:gap-5 max-[1250px]:gap-3 max-[1050px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[540px]:gap-2.5"
        data-seller="stats-grid"
      >
        <StatCard
          label="Số dư khả dụng"
          value={money(user.wallet?.balance ?? 0)}
          detail="Đồng bộ từ tài khoản"
          icon={<WalletOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Số dư đang khóa"
          value={money(user.wallet?.lockedBalance ?? 0)}
          detail="Theo thông tin ví trên hệ thống"
          icon={<LockOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Đơn vị tiền tệ"
          value={user.wallet?.currency ?? 'VND'}
          detail="Tiền tệ của ví NEXUS"
          icon={<CreditCardOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Điểm uy tín"
          value={user.reputationScore}
          detail={trustLabels[user.trustLevel] || user.trustLevel}
          icon={<SafetyCertificateOutlined className="text-[20px]" aria-hidden="true" />}
        />
      </div>
      <div
        className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5 max-[1050px]:[grid-template-columns:1fr]"
        data-seller="two-columns"
      >
        <Panel
          title="Ví tài khoản NEXUS"
          subtitle="Số dư hiện tại trên hệ thống"
          action={<Badge tone="green">Dữ liệu tài khoản</Badge>}
        >
          <div
            className="[border:1px_solid_#e2eafa] [background:linear-gradient(120deg,_#f3f7ff,_#fafcff)] rounded-[10px] p-5 flex items-center justify-between gap-3 mb-[15px] [&_small]:text-[9px] [&_small]:text-[#899dbd] [&_small]:tracking-[0.7px] [&_strong]:block [&_strong]:text-[26px] [&_strong]:tracking-[-1px] [&_strong]:font-bold [&_strong]:my-1.5 [&_strong]:mx-0 [&_p]:text-[9px] [&_p]:text-[#93a4be] [&_p]:m-0 [&>.anticon]:text-[#81a2ec]!"
            data-seller="wallet-highlight"
          >
            <div>
              <small>SỐ DƯ KHẢ DỤNG</small>
              <strong>{money(user.wallet?.balance ?? 0)}</strong>
              <p>{user.email}</p>
            </div>
            <WalletOutlined className="text-[39px]" aria-hidden="true" />
          </div>
          <div
            className="flex items-center justify-between text-[10px] py-[11px] px-0 text-[#90a0b9] [border-bottom:1px_solid_#f0f3f8] [&_span:not(.anticon)]:flex [&_span:not(.anticon)]:items-center [&_span:not(.anticon)]:gap-2 [&_b]:text-[#4b5f80]"
            data-seller="wallet-details"
          >
            <span>Số dư đang khóa</span>
            <b>{money(user.wallet?.lockedBalance ?? 0)}</b>
          </div>
          <div
            className="flex items-center justify-between text-[10px] py-[11px] px-0 text-[#90a0b9] [border-bottom:1px_solid_#f0f3f8] [&_span:not(.anticon)]:flex [&_span:not(.anticon)]:items-center [&_span:not(.anticon)]:gap-2 [&_b]:text-[#4b5f80]"
            data-seller="wallet-details"
          >
            <span>Trạng thái tài khoản</span>
            <Badge tone={user.isVerified ? 'green' : 'amber'}>
              {user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
            </Badge>
          </div>
          <div
            className="flex gap-2.5 items-center p-[15px] [border:1px_solid_#e3ebfa] bg-[#f4f8ff] rounded-[9px] text-[#8194b1] text-[11px] leading-[1.8] [&>.anticon]:shrink-0 [&>.anticon]:text-[#7194db]! [&>[data-seller~=text-button]]:ml-auto [&>[data-seller~=text-button]]:whitespace-nowrap max-[540px]:text-[10px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:flex-1 max-[540px]:[&_[data-seller~=text-button]]:ml-[27px] mt-4.5"
            data-seller="info-note"
          >
            <QuestionCircleOutlined className="text-[18px]" aria-hidden="true" />
            Nạp, rút tiền và liên kết ngân hàng chưa được hỗ trợ tại đây.
          </div>
        </Panel>
        <Panel
          title="Giải ngân & bảo vệ thanh toán"
          subtitle="Theo dõi dòng tiền qua từng giai đoạn"
        >
          <div
            className="flex flex-col gap-2.5 [&>div]:flex [&>div]:gap-[9px] [&>div]:p-3 [&>div]:[border:1px_solid_#edf1f9] [&>div]:rounded-[8px] [&>div]:bg-[#f8faff] [&>div>b]:grid [&>div>b]:[place-items:center] [&>div>b]:w-[21px] [&>div>b]:h-[21px] [&>div>b]:bg-[#315eea] [&>div>b]:text-[white] [&>div>b]:rounded-full [&>div>b]:text-[10px] [&>div>b]:shrink-0 [&_strong]:text-[10px] [&_strong]:font-[550] [&_p]:text-[9px] [&_p]:text-[#92a3be] [&_p]:[margin:4px_0_0] [&_p]:leading-[1.8]"
            data-seller="steps"
          >
            {[
              ['Người mua thanh toán', 'Khoản thanh toán được ghi nhận theo phương thức đã chọn.'],
              ['Bảo vệ trong Escrow', 'Tiền được giữ trong thời gian thực hiện đơn hàng.'],
              [
                'Hoàn tất & giải ngân',
                'Giải ngân sau khi người mua xác nhận và không có tranh chấp.',
              ],
            ].map(([title, text], index) => (
              <div key={title}>
                <b>{index + 1}</b>
                <span>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </span>
              </div>
            ))}
          </div>
          <p
            className="text-center text-[9px] text-[#98a7bf] [margin:13px_0_0]"
            data-seller="chart-footnote"
          >
            Phí sàn theo đặc tả hiện tại: 7% khi giải ngân.
          </p>
        </Panel>
      </div>
      <Panel title="Lịch sử giao dịch" subtitle="Theo dõi các khoản thu, chi và biến động số dư">
        <div
          className="flex gap-2.5 items-center p-[15px] [border:1px_solid_#e3ebfa] bg-[#f4f8ff] rounded-[9px] text-[#8194b1] text-[11px] leading-[1.8] [&>.anticon]:shrink-0 [&>.anticon]:text-[#7194db]! [&>[data-seller~=text-button]]:ml-auto [&>[data-seller~=text-button]]:whitespace-nowrap max-[540px]:text-[10px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:flex-1 max-[540px]:[&_[data-seller~=text-button]]:ml-[27px]"
          data-seller="info-note"
        >
          <FileTextOutlined className="text-[17px]" aria-hidden="true" />
          Chưa có dữ liệu lịch sử giao dịch từ hệ thống.
        </div>
        <EmptyState
          title="Chưa có giao dịch để hiển thị"
          description="Các biến động số dư sẽ được liệt kê tại đây khi dịch vụ giao dịch được kết nối."
        />
      </Panel>
      <PolicyCards />
    </div>
  );
}
