import { Box, Mic, Radio, Video, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Panel } from '../../components/adminDashboard/AdminUI';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';
import { mockSettings } from '../../components/adminDashboard/mockData/settings';
import { mockStudio } from '../../components/adminDashboard/mockData/studio';

// Studio mô phỏng giao diện điều khiển phiên, chưa mở camera/micro hoặc dựng mô hình WebGL.
export default function AdminStudioPage() {
  // Cùng nguồn phiên đấu giá với trang Đấu giá, nên phiên vừa duyệt xuất hiện ở đây.
  const { data, actions } = useAdminContext();
  // Chỉ chọn phiên đã duyệt/đang live; phiên pending cần được duyệt tại tab Đấu giá trước.
  const sessions = data.auctions.filter((item) => item.status !== 'pending');
  // Khởi tạo chọn phiên đầu tiên khi mở tab; chuỗi rỗng nghĩa là chưa chọn phiên.
  const [selected, setSelected] = useState(sessions[0]?.id ?? '');
  // Các biến này chỉ đổi trạng thái UI; reload/đổi tab sẽ reset bản mô phỏng.
  const [broadcasting, setBroadcasting] = useState(false);
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
      {/* 1. Khung xem trước phiên phát sóng và các nút bật/tắt mic, camera, phát demo. */}
      <Panel
        title="Studio phát trực tiếp 3D"
        subtitle="Điều khiển phiên đấu giá và kiểm tra thiết lập trước khi phát sóng"
        icon={<Radio size={19} />}
        action={
          <Badge tone={broadcasting ? 'green' : 'gray'}>
            {broadcasting ? '● LIVE DEMO' : 'STANDBY'}
          </Badge>
        }
      >
        {/* aspect-video giữ khung tỷ lệ 16:9; lớp lưới nền chỉ để minh họa không gian 3D. */}
        <div className="relative flex aspect-video flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-primary-dark text-white">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <Box size={64} strokeWidth={1} className="relative text-blue-200" />
          <p className="relative text-sm font-semibold">
            {broadcasting ? 'Đang mô phỏng phát sóng' : 'Không gian đấu giá WebGL'}
          </p>
          <p className="relative px-4 text-center text-xs text-blue-200">
            Camera, âm thanh và mô hình 3D chưa kết nối dịch vụ trực tiếp.
          </p>
          <span className="absolute left-4 top-4 rounded bg-white/10 px-2 py-1 text-[10px]">
            PREVIEW • {mockStudio.previewResolution}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant="secondary" aria-pressed={mic} onClick={() => setMic(!mic)}>
              <Mic size={15} />
              Mic {mic ? 'bật' : 'tắt'}
            </Button>
            <Button variant="secondary" aria-pressed={camera} onClick={() => setCamera(!camera)}>
              <Video size={15} />
              Camera {camera ? 'bật' : 'tắt'}
            </Button>
          </div>
          <Button
            disabled={!selected}
            onClick={() => {
              setBroadcasting(!broadcasting);
              actions.notify(
                broadcasting
                  ? 'Đã dừng mô phỏng phát sóng.'
                  : 'Đã bắt đầu mô phỏng phát sóng, chưa truyền video thực tế.',
              );
            }}
          >
            <Radio size={15} />
            {broadcasting ? 'Dừng phát demo' : 'Bắt đầu phát demo'}
          </Button>
        </div>
      </Panel>
      <div className="space-y-5">
        {/* 2. Chọn phiên đấu giá đã duyệt và xem cấu hình phát sóng. */}
        <Panel title="Thiết lập phiên" icon={<Radio size={18} />}>
          <label className="text-xs font-medium text-slate-600">
            Phiên đấu giá
            <select
              disabled={broadcasting}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
            >
              <option value="">Chọn phiên đã duyệt</option>
              {sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} • {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-5 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Chất lượng phát</span>
              <b>{mockStudio.quality}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Anti-sniping</span>
              <b className="text-primary">+{mockSettings.antiSniping} giây</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phí sàn</span>
              <b>{mockSettings.auctionFee}%</b>
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => actions.navigate('auctions')}
          >
            Quản lý lịch đấu giá
          </Button>
        </Panel>

        {/* 3. Danh sách kiểm tra kết nối và âm thanh; các trạng thái hiện là minh họa. */}
        <Panel title="Kiểm tra tín hiệu" icon={<Volume2 size={18} />}>
          <div className="space-y-3 text-xs">
            {['Kết nối WebSocket', 'WebGL renderer', 'Âm thanh đầu vào'].map((label) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-slate-500">{label}</span>
                <Badge tone="blue">Demo</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
