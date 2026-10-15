import { ShieldCheck, Settings2, Save } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Panel } from './AdminUI';
import type { AdminTabProps } from './adminTypes';

// Khối từ khóa dùng chung ở Tổng quan/Cài đặt. State nằm trong mỗi instance component,
// nên hai nơi chưa đồng bộ và sẽ reset khi đổi tab. Để lưu chung cần đưa state lên AdminPage.
export function ModerationCard({ actions }: Pick<AdminTabProps, 'actions'>) {
  const [keywords, setKeywords] = useState([
    'súng, đạn',
    'vũ khí',
    'chất gây nghiện',
    'ngà voi',
    'tiền giả',
  ]);
  const [editing, setEditing] = useState(false);
  // draft là bản đang sửa; tách khỏi keywords để bấm Hủy không đổi danh sách đã hiển thị.
  const [draft, setDraft] = useState(keywords.join('; '));
  return (
    <Panel
      title="Kiểm duyệt từ khóa cấm"
      subtitle="Bộ lọc hỗ trợ chặn đăng tin chứa hàng hóa vi phạm"
      icon={<ShieldCheck size={19} />}
      action={<Badge tone="green">ACTIVE</Badge>}
    >
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            // Tách bằng dấu ; → bỏ khoảng trắng thừa → loại mục rỗng do nhập dư dấu ;.
            setKeywords(
              draft
                .split(';')
                .map((word) => word.trim())
                .filter(Boolean),
            );
            setEditing(false);
            actions.notify('Đã cập nhật từ khóa trong bản demo.');
          }}
        >
          <label className="text-xs text-slate-500">
            Các từ khóa cách nhau bằng dấu ;
            <textarea
              aria-label="Danh sách từ khóa cấm"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-xs"
              rows={3}
            />
          </label>
          <div className="mt-2 flex gap-2">
            <Button type="submit">Lưu từ khóa</Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Hủy
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {keywords.map((word, index) => (
              <Badge key={`${word}-${index}`} tone="gray">
                {word}
              </Badge>
            ))}
          </div>
          <div className="mt-7 flex items-center justify-between gap-2 text-[10px]">
            <p className="text-slate-500">
              24h qua chặn: <b className="text-primary">18 tin vi phạm</b>
            </p>
            <button
              onClick={() => {
                setDraft(keywords.join('; '));
                setEditing(true);
              }}
              className="font-semibold text-primary hover:underline"
            >
              Cập nhật từ khóa
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}

// Cấu hình chỉ lưu ở state của tab. "Lưu" hiện báo toast, chưa gửi API hoặc lưu lâu dài.
// Đổi phí tại đây chưa tác động đến các số liệu fixture trong Overview/Auctions/Finance.
export default function SettingsTab({ actions }: AdminTabProps) {
  const [auctionFee, setAuctionFee] = useState(16);
  const [normalFee, setNormalFee] = useState(7);
  const [deposit, setDeposit] = useState(10);
  const [antiSniping, setAntiSniping] = useState(120);
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
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
      <ModerationCard actions={actions} />
    </div>
  );
}
