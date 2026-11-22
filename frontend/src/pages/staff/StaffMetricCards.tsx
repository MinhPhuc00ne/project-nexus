import { Clock3, MessageCircle, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('staff');
  const metrics = [
    {
      label: t('inbox.metrics.chatting'),
      value: chattingCount,
      Icon: MessageCircle,
      tone: 'blue',
      hint: t('inbox.metrics.chattingHint'),
    },
    {
      label: t('inbox.metrics.waiting'),
      value: waitingCount,
      Icon: Clock3,
      tone: 'amber',
      hint: t('inbox.metrics.waitingHint'),
    },
    {
      label: t('inbox.metrics.resolved'),
      value: resolvedCount,
      Icon: CheckCheck,
      tone: 'green',
      hint: t('inbox.metrics.resolvedHint'),
    },
  ];

  return (
    <div className="support-metrics-strip" aria-label={t('inbox.metrics.aria')}>
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
