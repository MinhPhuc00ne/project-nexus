import { Box, Mic, Radio, Video, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Panel } from '../../components/adminDashboard/shared/AdminUI';
import { useAdminContext } from '../../components/adminDashboard/shared/useAdminContext';
import { mockSettings } from '../../components/adminDashboard/Settings/mockData/settings';
import { mockStudio } from '../../components/adminDashboard/Studio/mockData/studio';

const SIGNAL_CHECK_KEYS = ['ws', 'webgl', 'audio'] as const;

// Studio mô phỏng giao diện điều khiển phiên, chưa mở camera/micro hoặc dựng mô hình WebGL.
export default function AdminStudioPage() {
  const { t } = useTranslation('admin');
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
        title={t('studio.title')}
        subtitle={t('studio.subtitle')}
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
            {broadcasting ? t('studio.statusSimulating') : t('studio.webglTitle')}
          </p>
          <p className="relative px-4 text-center text-xs text-blue-200">
            {t('studio.webglSubtitle')}
          </p>
          <span className="absolute left-4 top-4 rounded bg-white/10 px-2 py-1 text-[10px]">
            PREVIEW • {mockStudio.previewResolution}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant="secondary" aria-pressed={mic} onClick={() => setMic(!mic)}>
              <Mic size={15} />
              {mic ? t('studio.micOn') : t('studio.micOff')}
            </Button>
            <Button variant="secondary" aria-pressed={camera} onClick={() => setCamera(!camera)}>
              <Video size={15} />
              {camera ? t('studio.cameraOn') : t('studio.cameraOff')}
            </Button>
          </div>
          <Button
            disabled={!selected}
            onClick={() => {
              setBroadcasting(!broadcasting);
              actions.notify(broadcasting ? t('studio.toastStopped') : t('studio.toastStarted'));
            }}
          >
            <Radio size={15} />
            {broadcasting ? t('studio.stopDemo') : t('studio.startDemo')}
          </Button>
        </div>
      </Panel>
      <div className="space-y-5">
        {/* 2. Chọn phiên đấu giá đã duyệt và xem cấu hình phát sóng. */}
        <Panel title={t('studio.sessionSettingsTitle')} icon={<Radio size={18} />}>
          <label className="text-xs font-medium text-slate-600">
            {t('studio.auctionSession')}
            <select
              disabled={broadcasting}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
            >
              <option value="">{t('studio.selectApprovedSession')}</option>
              {sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} • {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-5 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('studio.streamQuality')}</span>
              <b>{mockStudio.quality}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Anti-sniping</span>
              <b className="text-primary">
                {t('studio.antiSnipingSeconds', { seconds: mockSettings.antiSniping })}
              </b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('studio.platformFee')}</span>
              <b>{mockSettings.auctionFee}%</b>
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => actions.navigate('auctions')}
          >
            {t('studio.manageAuctionSchedule')}
          </Button>
        </Panel>

        {/* 3. Danh sách kiểm tra kết nối và âm thanh; các trạng thái hiện là minh họa. */}
        <Panel title={t('studio.signalCheckTitle')} icon={<Volume2 size={18} />}>
          <div className="space-y-3 text-xs">
            {SIGNAL_CHECK_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-slate-500">{t(`studio.signalChecks.${key}`)}</span>
                <Badge tone="blue">Demo</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
