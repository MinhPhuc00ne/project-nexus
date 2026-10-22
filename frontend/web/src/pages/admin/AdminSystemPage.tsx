import { Activity, Server } from 'lucide-react';
import { EventLog, LogisticsCard } from '../../components/adminDashboard/SystemCards';
import { Panel } from '../../components/adminDashboard/AdminUI';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';
import { mockSystemStatus } from '../../components/adminDashboard/mockData/system';

// Nội dung riêng của trang; các card dùng ở cả Tổng quan được tách sang components/adminDashboard.
export default function AdminSystemPage() {
  // Chỉ lấy các thao tác cần dùng; layout quản lý thông báo và dữ liệu chung.
  const { actions } = useAdminContext();

  return (
    <div className="space-y-5">
      {/* 1. Các thẻ trạng thái kỹ thuật: độ trễ WebSocket, cụm WebGL và thời gian hoạt động. */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'WebSocket engine', value: mockSystemStatus.websocketLatency, icon: Activity },
          { label: 'WebGL cluster', value: mockSystemStatus.webglCluster, icon: Server },
          { label: 'Uptime hệ thống', value: mockSystemStatus.uptime, icon: Activity },
        ].map(({ label, value, icon: Icon }) => (
          <Panel key={label} title={label} icon={<Icon size={18} />}>
            <p className="text-2xl font-bold text-primary">{value}</p>
            <p className="mt-2 text-xs text-slate-400">Trạng thái minh họa • chưa kết nối API</p>
          </Panel>
        ))}
      </div>

      {/* 2. Trạng thái kết nối vận chuyển bên trái; danh sách sự kiện và xuất JSON bên phải. */}
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.5fr]">
        <LogisticsCard actions={actions} />
        <EventLog />
      </div>
    </div>
  );
}
