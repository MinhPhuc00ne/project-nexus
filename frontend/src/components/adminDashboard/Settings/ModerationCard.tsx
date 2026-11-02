import { mockModeration, mockModerationKeywords } from './mockData/moderation';
// Khối chỉnh từ khóa cấm dùng ở Tổng quan và Cài đặt; dữ liệu hiện chỉ lưu trong từng lần mở.

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Panel } from '../shared/AdminUI';
import type { AdminTabProps } from '../shared/adminTypes';

// Khối từ khóa dùng chung ở Tổng quan/Cài đặt. State nằm trong mỗi instance component,
// nên hai nơi chưa đồng bộ và sẽ reset khi đổi tab. Để lưu chung cần đưa state lên AdminLayout.
export function ModerationCard({ actions }: Pick<AdminTabProps, 'actions'>) {
  const [keywords, setKeywords] = useState(() => [...mockModerationKeywords]);
  const [editing, setEditing] = useState(false);
  // draft là bản đang sửa; tách khỏi keywords để bấm Hủy không đổi danh sách đã hiển thị.
  const [draft, setDraft] = useState(keywords.join('; '));

  return (
    <Panel
      title="Kiểm duyệt từ khóa cấm"
      subtitle="Bộ lọc hỗ trợ chặn đăng tin chứa hàng hóa vi phạm"
      icon={<ShieldCheck size={19} />}
      action={<Badge tone="green">{mockModeration.status}</Badge>}
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
              24h qua chặn:{' '}
              <b className="text-primary">{mockModeration.blockedLast24Hours} tin vi phạm</b>
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
