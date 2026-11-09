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
  const metrics = [
    {
      label: 'Đang xử lý',
      value: chattingCount,
      Icon: MessageCircle,
      tone: 'blue',
      hint: 'Hội thoại đang chat',
    },
    {
      label: 'Chờ tiếp nhận',
      value: waitingCount,
      Icon: Clock3,
      tone: 'amber',
      hint: 'Khách hàng chờ hỗ trợ',
    },
    {
      label: 'Đã hoàn tất',
      value: resolvedCount,
      Icon: CheckCheck,
      tone: 'green',
      hint: 'Hội thoại đã xử lý',
    },
  ];

  return (
    <div className="support-metrics-strip" aria-label="Tổng quan hội thoại">
      {metrics.map(({ label, value, Icon, tone, hint }) => (
        <div key={label} title={hint} className={`support-metric-chip ${tone}`}>
          <Icon size={14} className="shrink-0" />
          <span className="text-[11px] font-medium">{label}</span>
          <span className="support-metric-count">{hasTickets ? value : '–'}</span>
        </div>
      ))}
    </div>
  );
}
