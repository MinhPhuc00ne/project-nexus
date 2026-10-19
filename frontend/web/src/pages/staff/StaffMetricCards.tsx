import type { ReactNode } from 'react';
import { FieldTimeOutlined, MessageOutlined, StarOutlined } from '@ant-design/icons';
import { Gavel } from 'lucide-react';

interface StaffMetricCardsProps {
  chattingCount: number;
  waitingCount: number;
  hasTickets: boolean;
}

export default function StaffMetricCards({
  chattingCount,
  waitingCount,
  hasTickets,
}: StaffMetricCardsProps) {
  return (
    <section
      className="mt-3.5 max-[760px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] grid grid-cols-4 gap-3"
      aria-label="Chỉ số hỗ trợ"
    >
      <MetricCard
        icon={<MessageOutlined style={{ fontSize: 18 }} />}
        tone="coral"
        label="HỘI THOẠI ĐANG XỬ LÝ"
        value={!hasTickets ? '' : String(chattingCount)}
        suffix=""
        footerLabel="SLA phản hồi TB"
        footerValue=""
      />
      <MetricCard
        icon={<FieldTimeOutlined style={{ fontSize: 18 }} />}
        tone="amber"
        label="HÀNG ĐỢI CHỜ HỖ TRỢ"
        value={!hasTickets ? '' : String(waitingCount)}
        suffix=""
        footerLabel="Thời gian chờ TB"
        footerValue=""
      />
      <MetricCard
        icon={<StarOutlined style={{ fontSize: 18 }} />}
        tone="blue"
        label="TỶ LỆ HÀI LÒNG CSAT"
        value=""
        suffix=""
        footerLabel="Tổng lượt đánh giá"
        footerValue=""
      />
      <MetricCard
        icon={<Gavel size={18} />}
        tone="red"
        label="TRANH CHẤP CẦN CAN THIỆP"
        value=""
        suffix=""
        footerLabel="Tạm giữ cọc"
        footerValue=""
      />
    </section>
  );
}

function MetricCard({
  icon,
  tone,
  label,
  value,
  suffix,
  footerLabel,
  footerValue,
}: {
  icon: ReactNode;
  tone: 'coral' | 'amber' | 'blue' | 'red';
  label: string;
  value: string;
  suffix: string;
  footerLabel: string;
  footerValue: string;
}) {
  return (
    <article className="flex min-w-0 [min-height:150px] flex-col justify-between p-3.5 [border:1px_solid_#efedf5] [border-radius:12px] [background:#fff] [box-shadow:0_2px_8px_rgb(29_39_64_/_3%)] [&:last-child_.staff-kpi-footer]:[color:#a8483d] [&:last-child_.staff-kpi-footer]:[background:#fff0ee] [&:last-child_.staff-kpi-footer_b]:[color:#d9341b] max-[760px]:[min-height:138px] max-[760px]:[padding:11px]">
      <div className="flex items-center justify-between gap-2 [color:#9b8580] [font-size:9px] font-extrabold max-[420px]:[font-size:8px]">
        <span>{label}</span>
        <i
          className={`grid w-8 h-8 [flex:0_0_auto] [place-items:center] [border-radius:8px] [&.is-coral]:[color:var(--staff-primary)] [&.is-coral]:[background:#e5edff] [&.is-amber]:[color:#9e6216] [&.is-amber]:[background:#ffebd0] [&.is-blue]:[color:var(--staff-primary)] [&.is-blue]:[background:#e1eaff] [&.is-red]:[color:#d9341b] [&.is-red]:[background:#ffe1dd] is-${tone}`}
        >
          {icon}
        </i>
      </div>
      <div
        className={`flex items-center justify-between gap-2 justify-start [color:var(--staff-primary)] [&_b]:[color:#18233a] [&_b]:[font-size:30px] [&_b]:leading-none [&_span]:text-[11px] [&_span]:font-extrabold [&.is-coral_span]:[color:var(--staff-accent)] [&.is-amber_span]:[color:#9e6216] [&.is-red]:[color:#d9341b] [&.is-red_b]:[color:#d9341b] [&.is-red_span]:[color:#d9341b] is-${tone}`}
      >
        <b>{value}</b>
        <span>{suffix}</span>
      </div>
      <div className="flex items-center justify-between gap-2 [min-height:34px] [padding:0_9px] [border-radius:8px] [color:#938a98] [background:#f1f2ff] [font-size:9px] [&_b]:[color:var(--staff-primary)] [&_b]:[font-size:9px] max-[420px]:px-1.5 max-[420px]:[font-size:8px] max-[420px]:[&_b]:[font-size:8px]">
        <span>{footerLabel}</span>
        <b>{footerValue}</b>
      </div>
    </article>
  );
}
