import { useEffect, useState } from 'react';
import { X as CloseOutlined } from 'lucide-react';
import { Image as PictureOutlined, Upload as UploadOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  PRODUCT_IMAGE_LIMIT,
  validateProductImages,
} from '@/features/catalog/services/sellerProducts';

export default function SellerProductImages({
  files,
  onChange,
  existingImages = [],
  onExistingImagesChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  existingImages?: string[];
  onExistingImagesChange?: (images: string[]) => void;
}) {
  const { t } = useTranslation('seller');
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function select(selected: FileList | null): void {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)];
    try {
      if (next.length + existingImages.length > PRODUCT_IMAGE_LIMIT)
        throw new Error(t('productForm.images.maxImagesErr'));
      validateProductImages(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('productForm.images.invalidErr'));
      return;
    }
    setError('');
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-7 text-center hover:bg-blue-50">
        <UploadOutlined className="text-3xl text-blue-600" />
        <span className="text-sm font-semibold text-slate-800">
          {t('productForm.images.chooseLabel')}
        </span>
        <span className="text-xs leading-6 text-slate-500">
          {t('productForm.images.hint', { limit: PRODUCT_IMAGE_LIMIT })}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            select(event.target.files);
            event.target.value = '';
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {existingImages.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {existingImages.map((url, index) => (
            <li
              key={`${index}-${url}`}
              className="relative rounded-xl border border-slate-200 bg-slate-50 p-2"
            >
              <img
                src={url}
                alt={t('productForm.images.savedAlt', { index: index + 1 })}
                className="aspect-square w-full rounded-lg object-contain"
              />
              <button
                type="button"
                aria-label={t('productForm.images.removeSavedAria', { index: index + 1 })}
                onClick={() => {
                  setError('');
                  onExistingImagesChange?.(
                    existingImages.filter((_, position) => position !== index),
                  );
                }}
                className="absolute right-1 top-1 rounded-full border border-slate-200 bg-white p-1 text-slate-600"
              >
                <CloseOutlined />
              </button>
              <p className="mt-2 text-[10px] text-slate-500">
                {index === 0
                  ? t('productForm.images.coverLabel')
                  : t('productForm.images.savedLabel')}
              </p>
            </li>
          ))}
        </ul>
      )}
      {previews.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {previews.map((url, index) => (
            <li key={url} className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
              <img
                src={url}
                alt={t('productForm.images.newAlt', { index: index + 1 })}
                className="aspect-square w-full rounded-lg object-contain"
              />
              <button
                type="button"
                aria-label={t('productForm.images.removeNewAria', { index: index + 1 })}
                onClick={() => {
                  setError('');
                  onChange(files.filter((_, itemIndex) => itemIndex !== index));
                }}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
              >
                <CloseOutlined />
              </button>
              <p className="mt-2 truncate text-[10px] text-slate-500">
                {index === 0 ? t('productForm.images.coverPrefix') : ''}
                {files[index]?.name}
              </p>
            </li>
          ))}
        </ul>
      ) : !existingImages.length ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <PictureOutlined />
          {t('productForm.images.noneSelected')}
        </p>
      ) : null}
      <p className="text-xs leading-6 text-slate-500">{t('productForm.images.footerHint')}</p>
    </div>
  );
}
