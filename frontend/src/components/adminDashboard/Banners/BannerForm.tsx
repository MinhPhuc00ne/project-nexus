import { useRef, useState, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { bannerLink, type BannerInput } from '../../../services/banners';
import { uploadBannerImage } from '../../../services/banners.service';
import { Button, Panel } from '../shared/AdminUI';
import { Input } from '../../ui/input';
import { minEndDateTime } from '../../../utils/date-time';

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<BannerInput>) => {
    onUpdate(patch);
    if ('imageUrl' in patch) setPreviewFailed(false);
  };

  async function selectImage(file: File) {
    setUploading(true);
    setUploadError('');
    try {
      const imageUrl = await uploadBannerImage(file);
      update({ imageUrl });
      setFileName(file.name);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Không thể tải ảnh banner lên.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Panel
      title={id ? 'Chỉnh sửa banner' : 'Thêm banner'}
      subtitle="Chọn ảnh từ máy. Gợi ý ảnh ngang tỉ lệ 3:1, nội dung nằm trong ảnh."
    >
      <form
        onSubmit={(event) => {
          if (uploading || uploadError || !value.imageUrl) {
            event.preventDefault();
            return;
          }
          void submit(event);
        }}
      >
        <fieldset disabled={saving || uploading} className="grid min-w-0 gap-5 lg:grid-cols-2">
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
                  onChange={(event) => {
                    const startsAt = event.target.value
                      ? new Date(event.target.value).toISOString()
                      : null;
                    update({
                      startsAt,
                      ...(startsAt &&
                      value.endsAt &&
                      Date.parse(value.endsAt) <= Date.parse(startsAt)
                        ? { endsAt: null }
                        : {}),
                    });
                  }}
                />
              </label>
              <label className="block space-y-2 text-xs font-semibold">
                Kết thúc
                <Input
                  type="datetime-local"
                  value={localDate(value.endsAt)}
                  min={minEndDateTime(value.startsAt)}
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
              Thứ tự ưu tiên (1 hiển thị đầu tiên)
              <Input
                required
                type="number"
                min={1}
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
            <p className="mb-3 text-xs font-semibold">Ảnh banner</p>
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Chọn ảnh banner"
              className="hidden"
              accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void selectImage(file);
              }}
            />
            <div className="flex aspect-[3/1] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {bannerLink(value.imageUrl) && !previewFailed ? (
                <img
                  src={value.imageUrl}
                  alt={value.title || 'Ảnh banner'}
                  className="h-full w-full object-contain"
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                <p className="text-xs text-slate-500">Chưa có ảnh banner</p>
              )}
            </div>
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving || uploading}
              >
                <Upload size={18} />
                {uploading ? 'Đang tải ảnh…' : value.imageUrl ? 'Đổi ảnh banner' : 'Tải ảnh lên'}
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              JPG, PNG, WEBP, GIF hoặc SVG, tối đa 25MB.
            </p>
            {uploading && (
              <p role="status" className="mt-2 text-sm text-slate-500">
                Đang tải ảnh lên…
              </p>
            )}
            {fileName && !uploading && (
              <p className="mt-2 break-words text-xs text-slate-500">Ảnh đã tải: {fileName}</p>
            )}
            {previewFailed && (
              <p className="mt-2 text-xs text-slate-500">
                Không tải được ảnh. Vui lòng chọn lại ảnh.
              </p>
            )}
            {uploadError && (
              <p role="alert" className="mt-2 text-sm text-rose-600">
                {uploadError}
              </p>
            )}
          </div>
          {formError && (
            <p role="alert" className="text-sm text-rose-600 lg:col-span-2">
              {formError}
            </p>
          )}
          <div className="flex gap-2 lg:col-span-2">
            <Button type="submit" disabled={uploading || !!uploadError || !value.imageUrl}>
              {uploading ? 'Đang tải ảnh…' : saving ? 'Đang lưu…' : 'Lưu banner'}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Hủy
            </Button>
          </div>
        </fieldset>
      </form>
    </Panel>
  );
}
