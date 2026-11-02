import { useEffect, useState } from 'react';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { validateAvatarFile } from '../../services/profile';

interface AvatarPickerProps {
  savedUrl: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function AvatarPicker({ savedUrl, file, onChange }: AvatarPickerProps) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const image = file && preview?.file === file ? preview.url : savedUrl;
  return (
    <div className="space-y-2.5 sm:col-span-2">
      <p className="text-xs font-semibold text-slate-700">Ảnh đại diện tài khoản cá nhân</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-blue-200 bg-blue-50 text-2xl text-blue-600">
          {image ? (
            <img src={image} alt="Ảnh đại diện đang chọn" className="h-full w-full object-cover" />
          ) : (
            <UserOutlined />
          )}
        </div>
        <div className="min-w-0 space-y-1.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 focus-within:ring-2 focus-within:ring-blue-300 transition">
            <UploadOutlined /> Chọn ảnh từ thiết bị
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Chọn ảnh đại diện"
              className="sr-only"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                event.target.value = '';
                if (!selected) return;
                try {
                  validateAvatarFile(selected);
                  setError('');
                  onChange(selected);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : 'Ảnh không hợp lệ.');
                }
              }}
            />
          </label>
          <p className="text-[11px] text-slate-500">JPG, PNG hoặc WEBP · Tối đa 25 MB</p>
          {file && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="break-all text-slate-600">{file.name}</span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  onChange(null);
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Bỏ ảnh đã chọn
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Ảnh được tải lên khi bạn bấm Lưu thay đổi.</p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
