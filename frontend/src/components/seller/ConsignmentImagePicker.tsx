import { useEffect, useState, type ChangeEvent, type ReactElement } from 'react';
import { ImagePlus, X } from 'lucide-react';

/**
 * Configuration for an image picker used by an auction consignment form.
 */
export interface ConsignmentImagePickerProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onError: (message: string) => void;
  label: string;
  previewLabel: string;
  previewDescription: string;
}

/**
 * Renders a bounded image upload control with previews and removal actions.
 *
 * @param props - Image collection, update callbacks, and localized labels.
 * @returns Image selection input and its current previews.
 */
export default function ConsignmentImagePicker({
  files,
  onFilesChange,
  onError,
  label,
  previewLabel,
  previewDescription,
}: ConsignmentImagePickerProps): ReactElement {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const selectFiles = (event: ChangeEvent<HTMLInputElement>): void => {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;
    if (selected.some((file) => !file.type.startsWith('image/'))) {
      onError('Chỉ nhận tệp hình ảnh cho hồ sơ đấu giá.');
      event.target.value = '';
      return;
    }
    const merged = [...files, ...selected];
    if (merged.length > 5) {
      onError('Mỗi nhóm chỉ được tải tối đa 5 ảnh.');
      event.target.value = '';
      return;
    }
    onFilesChange(merged);
    event.target.value = '';
  };

  return (
    <>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-5 py-7 text-center text-sm text-slate-600 hover:bg-blue-50">
        <ImagePlus className="text-blue-600" size={28} aria-hidden="true" />
        <span className="font-medium text-blue-700">{label}</span>
        <span className="text-xs text-slate-500">PNG, JPG, WEBP · tối đa 5 ảnh</span>
        <input className="sr-only" type="file" accept="image/*" multiple onChange={selectFiles} />
      </label>
      {previews.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600">
            Đã chọn {previews.length}/5 {previewLabel} {previewDescription}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {previews.map((url, index) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs"
              >
                <img
                  src={url}
                  alt={`${previewLabel} ${index + 1}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {previewDescription && index === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                    Ảnh chính
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
                  aria-label={`Xóa ${previewLabel.toLocaleLowerCase()} ${index + 1}`}
                  title="Xóa ảnh"
                  className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1 text-white shadow-xs transition-colors hover:bg-red-600 cursor-pointer"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
