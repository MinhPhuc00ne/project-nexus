import { PictureOutlined } from '@ant-design/icons';
import type { ProductDetail } from '../../types/product.types';

interface Props {
  product: ProductDetail;
  selectedImgIdx: number;
  onSelectImage: (index: number) => void;
}
export default function ProductImageGallery({ product, selectedImgIdx, onSelectImage }: Props) {
  const image = product.images[selectedImgIdx] || product.images[0];
  return (
    <div className="flex flex-col gap-4 lg:col-span-5">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {image ? (
          <img src={image} alt={product.name} className="h-full w-full object-contain p-6" />
        ) : (
          <div className="space-y-3 text-center text-slate-400">
            <PictureOutlined className="text-4xl" />
            <p>Chưa có hình ảnh sản phẩm</p>
          </div>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {product.images.map((url, index) => (
          <button
            key={`${index}-${url}`}
            type="button"
            onClick={() => onSelectImage(index)}
            aria-label={`Xem ảnh ${index + 1}`}
            aria-pressed={selectedImgIdx === index}
            className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${selectedImgIdx === index ? 'border-blue-600' : 'border-slate-200'}`}
          >
            <img
              src={url}
              alt={`${product.name} - ảnh ${index + 1}`}
              className="h-full w-full object-contain p-1"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
