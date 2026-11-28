import { useId, useState, type ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validateReviewMediaFiles } from '@/features/reviews/services/reviews.service';

interface ReviewMediaPickerProps {
  files: File[];
  onChange: (nextFiles: File[]) => void;
  disabled?: boolean;
}

/**
 * Reusable image/video attachment picker for Buyer review & reply forms.
 */
export default function ReviewMediaPicker({
  files,
  onChange,
  disabled = false,
}: ReviewMediaPickerProps) {
  const { t } = useTranslation('guest');
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  const handlePick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (picked.length === 0) return;

    const merged = [...files, ...picked];
    const code = validateReviewMediaFiles(merged);
    if (code) {
      setError(t(`product.reviewMediaErrors.${code}`));
      return;
    }

    setError(null);
    onChange(merged);
  };

  const handleRemove = (index: number) => {
    setError(null);
    onChange(files.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
        >
          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          {t('product.attachReviewMedia')}
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          disabled={disabled}
          accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,.mp4,.mov"
          onChange={handlePick}
          className="sr-only"
        />
        <span className="text-[11px] text-slate-400">{t('product.reviewMediaHint')}</span>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${file.size}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
            >
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button
                type="button"
                aria-label={t('product.removeReviewFile', { name: file.name })}
                onClick={() => handleRemove(index)}
                className="text-slate-400 hover:text-rose-600"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
