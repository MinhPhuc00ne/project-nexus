import { Activity, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EventLog, LogisticsCard } from '../../components/adminDashboard/System/SystemCards';
import { Panel } from '../../components/adminDashboard/shared/AdminUI';
import { useAdminContext } from '../../components/adminDashboard/shared/useAdminContext';
import { mockSystemStatus } from '../../components/adminDashboard/System/mockData/system';

// Nội dung riêng của trang; các card dùng ở cả Tổng quan được tách sang components/adminDashboard.
export default function AdminSystemPage() {
  const { t } = useTranslation('admin');
  // Chỉ lấy các thao tác cần dùng; layout quản lý thông báo và dữ liệu chung.
  const { actions } = useAdminContext();

  return (
    <div className="space-y-5">
      {/* 1. Các thẻ trạng thái kỹ thuật: độ trễ WebSocket, cụm WebGL và thời gian hoạt động. */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('system.wsEngine'), value: mockSystemStatus.websocketLatency, icon: Activity },
          { label: t('system.webglCluster'), value: mockSystemStatus.webglCluster, icon: Server },
          { label: t('system.uptime'), value: mockSystemStatus.uptime, icon: Activity },
        ].map(({ label, value, icon: Icon }) => (
          <Panel key={label} title={label} icon={<Icon size={18} />}>
            <p className="text-2xl font-bold text-primary">{value}</p>
            <p className="mt-2 text-xs text-slate-400">{t('system.demoState')}</p>
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
