import { Settings2, Save } from 'lucide-react';
import { useState } from 'react';
import { ModerationCard } from '../../components/adminDashboard/ModerationCard';
import { Button, Panel } from '../../components/adminDashboard/AdminUI';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';

// Nội dung riêng của trang; các card dùng ở cả Tổng quan được tách sang components/adminDashboard.
export default function AdminSettingsPage() {
  // Chỉ lấy các thao tác cần dùng; layout quản lý thông báo và dữ liệu chung.
  const { actions } = useAdminContext();

  // Cấu hình riêng của trang: đổi trang sẽ reset; nút Lưu hiện chỉ thông báo demo.
  const [auctionFee, setAuctionFee] = useState(16);
  const [normalFee, setNormalFee] = useState(7);
  const [deposit, setDeposit] = useState(10);
  const [antiSniping, setAntiSniping] = useState(120);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      {/* 1. Form cấu hình phí sàn, tiền cọc và thời gian gia hạn đấu giá. */}
      <Panel
        title="Cài đặt sàn & đấu giá"
        subtitle="Cấu hình minh họa. Chưa lưu vào hệ thống backend."
        icon={<Settings2 size={19} />}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            actions.notify('Đã lưu cấu hình tại giao diện demo, chưa cập nhật backend.');
          }}
        >
          {[
            { label: 'Phí đấu giá 3D (%)', value: auctionFee, set: setAuctionFee, max: 100 },
            { label: 'Phí đơn thường (%)', value: normalFee, set: setNormalFee, max: 100 },
            { label: 'Tiền cọc đấu giá (%)', value: deposit, set: setDeposit, max: 100 },
            {
              label: 'Gia hạn anti-sniping (giây)',
              value: antiSniping,
              set: setAntiSniping,
              max: 600,
            },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600"
            >
              {item.label}
              <input
                type="number"
                min="0"
                max={item.max}
                required
                value={item.value}
                onChange={(event) => item.set(Number(event.target.value))}
                className="w-24 rounded-lg border border-slate-200 bg-slate-50 p-3 outline-none focus:border-blue-400"
              />
            </label>
          ))}
          <Button type="submit">
            <Save size={15} />
            Lưu cấu hình demo
          </Button>
        </form>
      </Panel>

      {/* 2. Danh sách từ khóa cấm và form chỉnh sửa; dùng chung khối UI với Tổng quan. */}
      <ModerationCard actions={actions} />
    </div>
  );
}
