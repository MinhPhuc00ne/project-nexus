import { cn } from '../../lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink as ExportOutlined } from 'lucide-react';
import {
  ChevronRight as RightOutlined,
  Database as DatabaseOutlined,
  Inbox as InboxOutlined,
  ShieldCheck as SafetyCertificateOutlined,
} from 'lucide-react';
import { useSellerWorkspace } from './SellerWorkspace';
export function SellerButton({
  children,
  secondary = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        `inline-flex items-center justify-center gap-[7px] bg-[#315eea] border border-solid border-[#315eea] rounded-[7px] text-[#fff] py-[9px] px-3.5 text-[11px]! font-[550] whitespace-nowrap min-h-9 disabled:cursor-not-allowed disabled:opacity-50 [&:hover]:bg-[#244ed1] [&:hover]:[box-shadow:0_3px_9px_#315eea20] ${secondary ? 'bg-white border-[#dfe6f1] text-[#4d5f7e] [&:hover]:bg-[#f3f7ff] [&:hover]:text-[#315eea] [&:hover]:[box-shadow:none]' : ''} ${className}`,
      )}
      data-seller="button button-secondary"
      {...props}
    >
      {children}
    </button>
  );
}
export function SellerLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={cn(
        `inline-flex items-center justify-center gap-[7px] bg-[#315eea] border border-solid border-[#315eea] rounded-[7px] text-[#fff] py-[9px] px-3.5 text-[11px]! font-[550] whitespace-nowrap min-h-9 [&:hover]:bg-[#244ed1] [&:hover]:[box-shadow:0_3px_9px_#315eea20] ${secondary ? 'bg-white border-[#dfe6f1] text-[#4d5f7e] [&:hover]:bg-[#f3f7ff] [&:hover]:text-[#315eea] [&:hover]:[box-shadow:none]' : ''}`,
      )}
      data-seller="button button-secondary"
      to={to}
    >
      {children}
    </Link>
  );
}
export function Badge({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'gray' | 'red';
}) {
  const colors = {
    blue: 'border-[#e1e9ff] bg-[#eff4ff] text-[#4167dc]',
    green: 'border-[#d5f1e5] bg-[#ecfaf4] text-[#0c9978]',
    amber: 'border-[#fbebc9] bg-[#fff8eb] text-[#bf8b26]',
    gray: 'border-[#e8edf5] bg-[#f2f5fa] text-[#7c8ba4]',
    red: 'border-[#f9dfe5] bg-[#fff0f2] text-[#ce596b]',
  };
  return (
    <span
      className={cn(
        `inline-flex items-center gap-1 rounded-[5px] py-[3px] px-[7px] text-[9px] font-[550] leading-[1.4] border border-solid border-transparent w-[fit-content] ${colors[tone]}`,
      )}
      data-seller="badge"
    >
      {children}
    </span>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        `[border:1px_solid_#e5ebf4] rounded-[12px] p-5.5 bg-white min-w-0 [&>[data-seller~=text-button]]:mt-4.5 [&>[data-seller~=button]]:mt-4.5 min-[1600px]:p-[25px] max-[1050px]:p-4.5 max-[540px]:p-[17px] ${className}`,
      )}
      data-seller="panel"
    >
      <div
        className="flex items-start justify-between gap-[15px] mb-5 [&_h2]:text-[13px] [&_h2]:font-[650] [&_h2]:tracking-[-0.15px] [&_h2]:m-0 [&_p]:text-[10px] [&_p]:text-[#8c9bb4] [&_p]:leading-[1.65] [&_p]:[margin:3px_0_0] [&>.anticon]:text-[#8fa0bc]! [&>.anticon]:shrink-0 max-[760px]:gap-2.5 max-[540px]:[&_h2]:text-[12px] max-[540px]:[&_p]:text-[9px] max-[540px]:[&>[data-seller~=text-button]]:text-[9px] max-[540px]:[&>[data-seller~=text-button]]:shrink-0"
        data-seller="panel-heading"
      >
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      <nav
        className="flex flex-wrap items-center gap-2 text-[#8a9ebf] text-[10px] [&>a]:text-[#8a9ebf] [&>span:not(.anticon)]:text-[#627495]"
        data-seller="breadcrumb"
        aria-label="Đường dẫn"
      >
        <Link to="/seller">Kênh người bán</Link>
        <RightOutlined className="text-[13px]" aria-hidden="true" />
        <span>{title}</span>
      </nav>
      <div
        className="flex items-center justify-between gap-5 [&_h1]:text-[23px] [&_h1]:font-bold [&_h1]:tracking-[-0.75px] [&_h1]:[margin:0_0_6px] [&_h1]:leading-[1.4] [&_p]:text-[11px] [&_p]:text-[#8e9db3] [&_p]:m-0 [&_p]:leading-[1.8] max-[1050px]:items-start max-[1050px]:flex-col max-[1050px]:gap-[13px] max-[1050px]:[&_h1]:text-[22px] max-[760px]:[&_h1]:text-[22px] max-[540px]:[&_h1]:text-[21px]"
        data-seller="page-heading"
      >
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="flex items-center gap-[9px] flex-wrap" data-seller="actions">
          {actions}
        </div>
      </div>
    </header>
  );
}
export function ModuleNotice({ label }: { label: string }) {
  const { preview, setPreview } = useSellerWorkspace();
  return (
    <div
      className={cn(
        `flex items-center gap-2 text-[#8b98ad] text-[10px] py-0 px-0.5 my-[-6px] mx-0 [&>.anticon]:text-[#93a4be]! [&>.anticon]:shrink-0 [&_button]:flex [&_button]:items-center [&_button]:gap-1 [&_button]:text-[#315eea] [&_button]:bg-transparent [&_button]:[border:0] [&_button]:p-1 [&_button]:ml-auto [&_button]:whitespace-nowrap [&_button]:font-[550] [&.is-preview]:text-[#b38b42] max-[540px]:items-start max-[540px]:text-[9px] max-[540px]:gap-1.5 max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:flex-1 max-[540px]:[&_button]:text-[9px] max-[540px]:[&_button]:p-0 max-[540px]:[&_button]:ml-5.5 ${preview ? 'is-preview' : ''}`,
      )}
      data-seller="module-notice"
    >
      <DatabaseOutlined className="text-[16px]" aria-hidden="true" />
      <span>
        {preview
          ? `${label}: dữ liệu minh họa, không phải giao dịch thật.`
          : `${label} chưa có dữ liệu từ hệ thống.`}
      </span>
      <button type="button" onClick={() => setPreview(!preview)}>
        {preview ? 'Tắt dữ liệu mẫu' : 'Xem dữ liệu mẫu'}
        <ExportOutlined className="text-[14px]" aria-hidden="true" />
      </button>
    </div>
  );
}
export function EmptyState({
  title = 'Chưa có dữ liệu',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="text-center flex items-center justify-center flex-col min-h-[195px] py-[25px] px-4 gap-2 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:m-0 [&_p]:text-[10px] [&_p]:leading-[1.8] [&_p]:text-[#95a3b8] [&_p]:max-w-[310px] [&_p]:[margin:0_0_8px]"
      data-seller="empty"
    >
      <div
        className="grid [place-items:center] w-[59px] h-[59px] rounded-[18px] bg-[#f2f6ff] text-[#8aa7e5] mb-[5px] [border:1px_solid_#e8eefb]"
        data-seller="empty-icon"
      >
        <InboxOutlined className="text-[28px]" aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      <p>{description || 'Dữ liệu sẽ xuất hiện tại đây khi có hoạt động mới.'}</p>
      {action}
    </div>
  );
}
export function StatCard({
  label,
  value,
  detail,
  icon,
  note,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div
      className="min-w-0 [border:1px_solid_#e5ebf4] bg-white rounded-[11px] [padding:19px_18px_0] [&:nth-child(2)_[data-seller~=stat-top]_i]:bg-[#e9f8fb] [&:nth-child(2)_[data-seller~=stat-top]_i]:text-[#2b9ab3] [&:nth-child(3)_[data-seller~=stat-top]_i]:bg-[#fff8e8] [&:nth-child(3)_[data-seller~=stat-top]_i]:text-[#d4a23b] [&:nth-child(4)_[data-seller~=stat-top]_i]:bg-[#f1efff] [&:nth-child(4)_[data-seller~=stat-top]_i]:text-[#7b69d9] [&>strong]:block [&>strong]:text-[23px] [&>strong]:tracking-[-0.7px] [&>strong]:leading-[1.3] [&>strong]:mt-4 [&>strong]:[overflow-wrap:anywhere] [&>strong]:font-bold min-[1600px]:[&>strong]:text-[28px] max-[1250px]:[&>strong]:text-[20px] max-[1250px]:[padding:15px_13px_0] max-[760px]:[&>strong]:text-[23px] max-[540px]:[padding:13px_12px_0] max-[540px]:[&>strong]:text-[21px] max-[540px]:[&>strong]:mt-[11px]"
      data-seller="stat"
    >
      <div
        className="flex items-center justify-between gap-1.5 text-[#7d8ba4] text-[11px] min-h-8.5 [&_i]:grid [&_i]:[place-items:center] [&_i]:bg-[#eef4ff] [&_i]:rounded-[8px] [&_i]:w-8 [&_i]:h-8 [&_i]:shrink-0 [&_i]:text-[#315eea] max-[540px]:text-[10px] max-[540px]:[&_i]:w-[27px] max-[540px]:[&_i]:h-[27px] max-[540px]:[&_i]:rounded-[7px] max-[540px]:[&_i>.anticon]:w-[17px]"
        data-seller="stat-top"
      >
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{value}</strong>
      <div
        className="text-[10px] text-[#8c99b0] [margin:7px_0_17px] min-h-4 [&>span:not(.anticon)]:flex [&>span:not(.anticon)]:items-center [&>span:not(.anticon)]:gap-[5px] max-[540px]:text-[9px] max-[540px]:mb-3"
        data-seller="stat-detail"
      >
        {detail}
      </div>
      {note && (
        <div
          className="[border-top:1px_solid_#eff2f7] py-[11px] px-0 text-[#8c9bb1] text-[9px] min-h-9.5 [&_a]:flex [&_a]:items-center [&_a]:justify-between [&_a]:text-[#7a8cab] max-[540px]:text-[8px] max-[540px]:py-[9px] max-[540px]:px-0"
          data-seller="stat-note"
        >
          {note}
        </div>
      )}
    </div>
  );
}
export function PolicyCards() {
  return (
    <div
      className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4.5 max-[1050px]:gap-3 max-[540px]:[grid-template-columns:1fr]"
      data-seller="policy-grid"
    >
      {[
        [
          'Bảo vệ giao dịch',
          'Thanh toán được giữ trong Escrow và giải ngân theo trạng thái hoàn tất đơn hàng.',
        ],
        [
          'Đóng gói & đồng kiểm',
          'Kiểm tra sản phẩm, lưu bằng chứng đóng gói và niêm phong trước khi bàn giao.',
        ],
        [
          'Uy tín người bán',
          'Thông tin chính xác, giao hàng đúng hẹn và phản hồi khách hàng giúp bảo vệ uy tín gian hàng.',
        ],
      ].map(([title, body]) => (
        <div
          className="bg-white [border:1px_solid_#e5ebf4] rounded-[11px] p-[21px] [&>.anticon]:text-[#7291d7]! [&>.anticon]:mb-3 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mb-[9px] [&_p]:text-[11px] [&_p]:text-[#8c9bb1] [&_p]:m-0 [&_p]:leading-[1.9] max-[1050px]:p-[17px] max-[760px]:[&_h3]:text-[11px] max-[760px]:[&_p]:text-[10px] max-[540px]:p-4.5 max-[540px]:grid max-[540px]:[grid-template-columns:24px_1fr] max-[540px]:gap-x-3 max-[540px]:[&>.anticon]:[grid-row:1/3] max-[540px]:[&>.anticon]:m-0 max-[540px]:[&_h3]:[margin:0_0_7px] max-[540px]:[&_h3]:text-[12px] max-[540px]:[&_p]:text-[10px]"
          data-seller="policy"
          key={title}
        >
          <SafetyCertificateOutlined className="text-[21px]" aria-hidden="true" />
          <h3>{title}</h3>
          <p>{body}</p>
        </div>
      ))}
    </div>
  );
}
export function exportCsv(filename: string, rows: (string | number)[][]) {
  const escape = (value: string | number) =>
    `"${String(value)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""')}"`;
  const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
