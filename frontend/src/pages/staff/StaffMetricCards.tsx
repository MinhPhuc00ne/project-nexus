import { Clock3, MessageCircle, CheckCheck } from 'lucide-react';
interface Props {
  chattingCount: number;
  waitingCount: number;
  hasTickets: boolean;
  resolvedCount?: number;
}
export default function StaffMetricCards({
  chattingCount,
  waitingCount,
  hasTickets,
  resolvedCount = 0,
}: Props) {
  return (
    <section className="support-metrics" aria-label="Tổng quan hội thoại">
      {[
        {
          label: 'Đang xử lý',
          value: chattingCount,
          Icon: MessageCircle,
          tone: 'blue',
          detail: 'Hội thoại đang được hỗ trợ',
        },
        {
          label: 'Chờ tiếp nhận',
          value: waitingCount,
          Icon: Clock3,
          tone: 'amber',
          detail: 'Khách hàng đang chờ nhân viên',
        },
        {
          label: 'Đã hoàn tất',
          value: resolvedCount,
          Icon: CheckCheck,
          tone: 'green',
          detail: 'Hội thoại đã xử lý trong danh sách',
        },
      ].map(({ label, value, Icon, tone, detail }) => (
        <article className="support-metric" key={label}>
          <span className={'support-metric-icon ' + tone}>
            <Icon size={21} />
          </span>
          <div>
            <p>{label}</p>
            <strong>{hasTickets ? value : '–'}</strong>
            <small>{detail}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
