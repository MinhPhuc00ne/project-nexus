import { mockLogistics, mockSystemEvents } from './mockData/system';
// Hai khối dùng ở Tổng quan và Hệ thống: trạng thái vận chuyển và danh sách nhật ký sự kiện.

import { Download, ScrollText, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Panel } from '../shared/AdminUI';
import type { AdminTabProps } from '../shared/adminTypes';

// Nhật ký cố định để dựng UI. Muốn cập nhật thời gian thực cần nguồn API/WebSocket riêng.

// Pick chỉ lấy kiểu của prop actions; card này không cần nhận toàn bộ AdminData.
// Endpoint và trạng thái GHN dưới đây chỉ là nội dung hiển thị, chưa gửi request thật.
export function LogisticsCard({ actions }: Pick<AdminTabProps, 'actions'>) {
  const { t } = useTranslation('admin');
  return (
    <Panel
      title={t('system.logistics.title')}
      subtitle={t('system.logistics.subtitle')}
      icon={<Truck size={19} />}
    >
      <div className="space-y-3 rounded-lg bg-blue-50 p-3 text-[11px]">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">{t('system.logistics.webhookEndpoint')}</span>
          <code className="break-all text-primary">{mockLogistics.webhookEndpoint}</code>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">{t('system.logistics.autoShipment')}</span>
          <Badge tone="green">
            {t('system.logistics.activeStatus', {
              defaultValue: mockLogistics.automaticShipmentStatus,
            })}
          </Badge>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className="text-slate-500">
          {t('system.logistics.latencyPrefix')} <b>{mockLogistics.latency}</b>
        </span>
        <button
          onClick={() => actions.notify(t('system.logistics.demoNotice'))}
          className="font-semibold text-primary hover:underline"
        >
          {t('system.logistics.retryFailed')}
        </button>
      </div>
    </Panel>
  );
}

// compact=true dùng trong Tổng quan để hiển thị 3 sự kiện; tab Hệ thống hiển thị đầy đủ.
export function EventLog({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('admin');
  const download = () => {
    // Chỉ xuất thời gian/nội dung; tone là class màu UI nên không đưa vào JSON tải xuống.
    // JSON.stringify(..., null, 2) thụt dòng 2 dấu cách cho dễ đọc.
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            mockSystemEvents.map(({ time, message }) => ({ time, message })),
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nexus-demo-event-log.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      title={t('system.events.title')}
      subtitle={t('system.events.subtitle')}
      icon={<ScrollText size={19} />}
      action={<span className="mt-3 size-2 shrink-0 rounded-full bg-blue-500" />}
    >
      <div className="space-y-2">
        {mockSystemEvents.slice(0, compact ? 3 : mockSystemEvents.length).map((event, index) => (
          <p
            key={event.time}
            className="rounded-lg bg-slate-50 p-3 font-mono text-[10px] leading-5 text-slate-600"
          >
            <span className={`font-bold ${event.tone}`}>[{event.time}]</span>{' '}
            {t(`system.events.items.${index}`, { defaultValue: event.message })}
          </p>
        ))}
      </div>
      <Button variant="secondary" onClick={download} className="mt-4 w-full">
        <Download size={13} />
        {t('system.events.exportJson')}
      </Button>
    </Panel>
  );
}
