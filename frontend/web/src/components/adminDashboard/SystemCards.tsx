import { mockLogistics, mockSystemEvents } from './mockData/system';
// Hai khối dùng ở Tổng quan và Hệ thống: trạng thái vận chuyển và danh sách nhật ký sự kiện.

import { Download, ScrollText, Truck } from 'lucide-react';
import { Badge, Button, Panel } from './AdminUI';
import type { AdminTabProps } from './adminTypes';

// Nhật ký cố định để dựng UI. Muốn cập nhật thời gian thực cần nguồn API/WebSocket riêng.

// Pick chỉ lấy kiểu của prop actions; card này không cần nhận toàn bộ AdminData.
// Endpoint và trạng thái GHN dưới đây chỉ là nội dung hiển thị, chưa gửi request thật.
export function LogisticsCard({ actions }: Pick<AdminTabProps, 'actions'>) {
  return (
    <Panel
      title="Kết nối GHN Logistics API"
      subtitle="Tự động kích hoạt webhook khi đấu giá gõ chốt phiên thành công"
      icon={<Truck size={19} />}
    >
      <div className="space-y-3 rounded-lg bg-blue-50 p-3 text-[11px]">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Webhook endpoint</span>
          <code className="break-all text-primary">{mockLogistics.webhookEndpoint}</code>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tạo vận đơn tự động</span>
          <Badge tone="green">{mockLogistics.automaticShipmentStatus}</Badge>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className="text-slate-500">
          Độ trễ phản hồi: <b>{mockLogistics.latency}</b>
        </span>
        <button
          onClick={() => actions.notify('Chưa kết nối API GHN. Đây là trạng thái minh họa.')}
          className="font-semibold text-primary hover:underline"
        >
          Tạo lại vận đơn lỗi
        </button>
      </div>
    </Panel>
  );
}

// compact=true dùng trong Tổng quan để hiển thị 3 sự kiện; tab Hệ thống hiển thị đầy đủ.
export function EventLog({ compact = false }: { compact?: boolean }) {
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
      title="Nhật ký sự kiện thời gian thực"
      subtitle="Theo dõi hoạt động hệ thống (dữ liệu demo)"
      icon={<ScrollText size={19} />}
      action={<span className="mt-3 size-2 shrink-0 rounded-full bg-blue-500" />}
    >
      <div className="space-y-2">
        {mockSystemEvents.slice(0, compact ? 3 : mockSystemEvents.length).map((event) => (
          <p
            key={event.time}
            className="rounded-lg bg-slate-50 p-3 font-mono text-[10px] leading-5 text-slate-600"
          >
            <span className={`font-bold ${event.tone}`}>[{event.time}]</span> {event.message}
          </p>
        ))}
      </div>
      <Button variant="secondary" onClick={download} className="mt-4 w-full">
        <Download size={13} />
        Xuất event log (JSON)
      </Button>
    </Panel>
  );
}
