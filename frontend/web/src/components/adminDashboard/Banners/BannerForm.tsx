import { useState, type FormEvent } from 'react';
import { bannerLink, type BannerInput } from '../../../services/banners';
import { Button, Panel } from '../shared/AdminUI';
import { Input } from '../../ui/input';

const localDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

interface BannerFormProps {
  id?: string;
  value: BannerInput;
  saving: boolean;
  formError: string;
  onUpdate: (patch: Partial<BannerInput>) => void;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
}

export default function BannerForm({
  id,
  value,
  saving,
  formError,
  onUpdate,
  submit,
  onCancel,
}: BannerFormProps) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const update = (patch: Partial<BannerInput>) => {
    onUpdate(patch);
    if ('imageUrl' in patch) setPreviewFailed(false);
  };

  return (
    <Panel
      title={id ? 'Chỉnh sửa banner' : 'Thêm banner'}
      subtitle="Dùng ảnh có sẵn qua URL HTTPS. Gợi ý ảnh ngang tỉ lệ 3:1, nội dung nằm trong ảnh."
    >
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={saving} className="grid min-w-0 gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="block space-y-2 text-xs font-semibold">
              Tiêu đề
              <Input
                required
                minLength={2}
                maxLength={150}
                value={value.title}
                onChange={(event) => update({ title: event.target.value })}
              />
            </label>
            <label className="block space-y-2 text-xs font-semibold">
              URL ảnh
              <Input
                required
                type="url"
                pattern="https?://.+"
                placeholder="https://example.com/banner.jpg"
                value={value.imageUrl}
                onChange={(event) => update({ imageUrl: event.target.value })}
              />
            </label>
            <label className="block space-y-2 text-xs font-semibold">
              Link khi bấm (không bắt buộc)
              <Input
                type="url"
                pattern="https?://.+"
                placeholder="https://..."
                value={value.targetUrl ?? ''}
                onChange={(event) => update({ targetUrl: event.target.value || null })}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-xs font-semibold">
                Bắt đầu
                <Input
                  type="datetime-local"
                  value={localDate(value.startsAt)}
                  onChange={(event) =>
                    update({
                      startsAt: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </label>
              <label className="block space-y-2 text-xs font-semibold">
                Kết thúc
                <Input
                  type="datetime-local"
                  value={localDate(value.endsAt)}
                  onChange={(event) =>
                    update({
                      endsAt: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Thời gian theo múi giờ thiết bị. Bỏ trống để không giới hạn.
            </p>
            <label className="block space-y-2 text-xs font-semibold">
              Độ ưu tiên (số lớn hiển thị trước)
              <Input
                required
                type="number"
                min={-1000}
                max={1000}
                step={1}
                value={value.priority}
                onChange={(event) => update({ priority: event.target.valueAsNumber })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.isActive}
                onChange={(event) => update({ isActive: event.target.checked })}
              />{' '}
              Bật banner
            </label>
          </div>
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold">Xem trước ảnh banner</p>
            <div className="flex aspect-[3/1] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {bannerLink(value.imageUrl) && !previewFailed ? (
                <img
                  src={value.imageUrl}
                  alt={value.title || 'Xem trước banner'}
                  className="h-full w-full object-contain"
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                <p className="p-4 text-center text-xs text-slate-500">
                  {previewFailed
                    ? 'Không tải được ảnh. Kiểm tra URL ảnh.'
                    : 'Nhập URL ảnh để xem trước.'}
                </p>
              )}
            </div>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-rose-600 lg:col-span-2">
              {formError}
            </p>
          )}
          <div className="flex gap-2 lg:col-span-2">
            <Button type="submit">{saving ? 'Đang lưu…' : 'Lưu banner'}</Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Hủy
            </Button>
          </div>
        </fieldset>
      </form>
    </Panel>
  );
}
