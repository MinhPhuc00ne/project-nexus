import { Image as PictureOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ProductDetail } from '../../types/product.types';

interface Props {
  product: ProductDetail;
  selectedImgIdx: number;
  onSelectImage: (index: number) => void;
}
export default function ProductImageGallery({ product, selectedImgIdx, onSelectImage }: Props) {
  const { t } = useTranslation('guest');
  const image = product.images[selectedImgIdx] || product.images[0];
  return (
    <div className="flex flex-col gap-4 lg:col-span-5">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {image ? (
          <img src={image} alt={product.name} className="h-full w-full object-contain p-6" />
        ) : (
          <div className="space-y-3 text-center text-slate-400">
            <PictureOutlined className="text-4xl" />
            <p>{t('product.noProductImages')}</p>
          </div>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {product.images.map((url, index) => (
          <button
            key={`${index}-${url}`}
            type="button"
            onClick={() => onSelectImage(index)}
            aria-label={t('product.viewImageAria', { index: index + 1 })}
            aria-pressed={selectedImgIdx === index}
            className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${selectedImgIdx === index ? 'border-blue-600' : 'border-slate-200'}`}
          >
            <img
              src={url}
              alt={t('product.imageAlt', { name: product.name, index: index + 1 })}
              className="h-full w-full object-contain p-1"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
