import { mockModeration, mockModerationKeywords } from './mockData/moderation';
// Khối chỉnh từ khóa cấm dùng ở Tổng quan và Cài đặt; dữ liệu hiện chỉ lưu trong từng lần mở.

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Panel } from '../shared/AdminUI';
import type { AdminTabProps } from '../shared/adminTypes';

// Khối từ khóa dùng chung ở Tổng quan/Cài đặt. State nằm trong mỗi instance component,
// nên hai nơi chưa đồng bộ và sẽ reset khi đổi tab. Để lưu chung cần đưa state lên AdminLayout.
export function ModerationCard({ actions }: Pick<AdminTabProps, 'actions'>) {
  const { t } = useTranslation('admin');
  const [keywords, setKeywords] = useState(() => [...mockModerationKeywords]);
  const [editing, setEditing] = useState(false);
  // draft là bản đang sửa; tách khỏi keywords để bấm Hủy không đổi danh sách đã hiển thị.
  const [draft, setDraft] = useState(keywords.join('; '));

  return (
    <Panel
      title={t('settings.moderation.title')}
      subtitle={t('settings.moderation.subtitle')}
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
            actions.notify(t('settings.moderation.updatedToast'));
          }}
        >
          <label className="text-xs text-slate-500">
            {t('settings.moderation.label')}
            <textarea
              aria-label={t('settings.moderation.listAria')}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-xs"
              rows={3}
            />
          </label>
          <div className="mt-2 flex gap-2">
            <Button type="submit">{t('settings.moderation.save')}</Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {t('settings.moderation.cancel')}
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
              {t('settings.moderation.blocked24hPrefix')}{' '}
              <b className="text-primary">
                {t('settings.moderation.blockedCount', {
                  count: mockModeration.blockedLast24Hours,
                })}
              </b>
            </p>
            <button
              onClick={() => {
                setDraft(keywords.join('; '));
                setEditing(true);
              }}
              className="font-semibold text-primary hover:underline"
            >
              {t('settings.moderation.editBtn')}
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}
