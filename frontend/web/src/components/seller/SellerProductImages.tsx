import { useEffect, useState } from 'react';
import { CloseOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';

export default function SellerProductImages({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
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
    if (next.length > 8) {
      setError('Chọn tối đa 8 ảnh sản phẩm.');
      return;
    }
    if (next.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if (next.some((file) => file.size > 5 * 1024 * 1024 || file.size === 0)) {
      setError('Mỗi ảnh phải có dung lượng lớn hơn 0 và không quá 5 MB.');
      return;
    }
    setError('');
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-7 text-center hover:bg-blue-50">
        <UploadOutlined className="text-3xl text-blue-600" />
        <span className="text-sm font-semibold text-slate-800">Chọn ảnh sản phẩm</span>
        <span className="text-xs leading-6 text-slate-500">
          Tối đa 8 ảnh JPG, PNG, WEBP · Mỗi ảnh không quá 5 MB
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
      {previews.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {previews.map((url, index) => (
            <li key={url} className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
              <img
                src={url}
                alt={`Ảnh sản phẩm ${index + 1}`}
                className="aspect-square w-full rounded-lg object-contain"
              />
              <button
                type="button"
                aria-label={`Bỏ ảnh ${index + 1}`}
                onClick={() => {
                  setError('');
                  onChange(files.filter((_, itemIndex) => itemIndex !== index));
                }}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
              >
                <CloseOutlined />
              </button>
              <p className="mt-2 truncate text-[10px] text-slate-500">
                {index === 0 ? 'Ảnh bìa · ' : ''}
                {files[index]?.name}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <PictureOutlined />
          Chưa chọn ảnh sản phẩm.
        </p>
      )}
      <p className="text-xs leading-6 text-slate-500">
        Ảnh chỉ xem trước trên màn hình này, chưa được tải lên máy chủ. Giới hạn ảnh sẽ được đối
        chiếu lại khi BE cung cấp API upload.
      </p>
    </div>
  );
}
