import { useRef, useState, type FormEvent } from 'react';
import { createCategory, deleteCategory, updateCategory } from '../../../services/admin';
import { categoryMoveError, flattenCategories } from '../../../utils/category-tree';
import type { CategoryTreeItem } from '../../../types/category.types';
import Popup from '../../Popup';
import { Input } from '../../ui/input';
import { Button } from '../shared/AdminUI';
import { useToast } from '../../ToastNotification';

export type CategoryAction =
  | { kind: 'create'; parent: CategoryTreeItem | null }
  | { kind: 'edit'; category: CategoryTreeItem }
  | { kind: 'move'; category: CategoryTreeItem; parent: CategoryTreeItem | null }
  | { kind: 'delete'; category: CategoryTreeItem };

export default function CategoryDialogs({
  action,
  categories,
  onClose,
  onSuccess,
}: {
  action: CategoryAction;
  categories: CategoryTreeItem[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(action.kind === 'edit' ? action.category.name : '');
  const [slug, setSlug] = useState(action.kind === 'edit' ? action.category.slug : '');
  const [parentId, setParentId] = useState(
    action.kind === 'edit' ? (action.category.parentId ?? '') : '',
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const isCreate = action.kind === 'create';
  const isEdit = action.kind === 'edit';
  const title = isCreate
    ? 'Thêm danh mục'
    : isEdit
      ? 'Sửa danh mục'
      : action.kind === 'move'
        ? 'Xác nhận chuyển danh mục'
        : 'Xóa danh mục';
  const parentOptions = flattenCategories(categories);

  const close = () => {
    if (!inFlight.current) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if ((isCreate || isEdit) && !name.trim()) {
      setError('Vui lòng nhập tên danh mục.');
      return;
    }
    if (action.kind === 'edit' || action.kind === 'move') {
      const parent =
        action.kind === 'move'
          ? action.parent
          : (parentOptions.find((item) => item.category.id === parentId)?.category ?? null);
      if (action.kind === 'edit' && parentId && !parent) {
        setError('Danh mục cha không còn tồn tại. Vui lòng tải lại danh sách.');
        return;
      }
      const moveError = categoryMoveError(action.category, parent);
      if (moveError) {
        setError(moveError);
        return;
      }
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      if (action.kind === 'create') {
        const created = await createCategory({
          name: name.trim(),
          slug: slug.trim() || undefined,
          parentId: action.parent?.id,
        });
        onSuccess(`Đã thêm danh mục "${created.name}".`);
      } else if (action.kind === 'edit') {
        const updated = await updateCategory(action.category.id, {
          name: name.trim(),
          slug: slug.trim() || undefined,
          parentId: parentId || null,
        });
        onSuccess(`Đã cập nhật danh mục "${updated.name}".`);
      } else if (action.kind === 'move') {
        await updateCategory(action.category.id, { parentId: action.parent?.id ?? null });
        onSuccess(
          `Đã chuyển "${action.category.name}" ${action.parent ? `vào "${action.parent.name}"` : 'về cấp gốc'}.`,
        );
      } else {
        const result = await deleteCategory(action.category.id);
        onSuccess(result.message);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể cập nhật danh mục.';
      setError(message);
      toast.error(message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Popup
      isOpen
      title={title}
      onClose={close}
      size="md"
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
    >
      <form onSubmit={submit} className="space-y-4">
        {action.kind === 'create' || action.kind === 'edit' ? (
          <>
            <p className="break-words rounded-lg bg-blue-50 p-3 text-sm text-slate-600">
              {action.kind === 'edit'
                ? 'Chỉnh sửa thông tin và chọn danh mục cha. Cả nhánh con sẽ được chuyển theo.'
                : action.parent
                  ? `Thêm danh mục cấp ${action.parent.level + 1} vào "${action.parent.name}".`
                  : 'Tạo danh mục gốc (cấp 1) cho toàn sàn.'}
            </p>
            <label className="block text-sm font-medium">
              Tên danh mục
              <Input
                autoFocus
                required
                maxLength={100}
                value={name}
                disabled={pending}
                onChange={(event) => setName(event.target.value)}
                className="mt-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Slug (không bắt buộc)
              <Input
                value={slug}
                disabled={pending}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="Để trống để tự tạo từ tên"
                className="mt-2"
              />
            </label>
            {action.kind === 'edit' && (
              <label className="block text-sm font-medium">
                Danh mục cha
                <select
                  value={parentId}
                  disabled={pending}
                  onChange={(event) => setParentId(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <option value="">Không có cha (danh mục gốc)</option>
                  {parentOptions
                    .filter(({ category }) => !categoryMoveError(action.category, category))
                    .map(({ category, path }) => (
                      <option key={category.id} value={category.id}>
                        {path}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </>
        ) : action.kind === 'move' ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p className="break-words">
              Chuyển <strong>{action.category.name}</strong> từ{' '}
              <strong>
                {parentOptions.find((item) => item.category.id === action.category.parentId)
                  ?.path ?? 'Cấp gốc'}
              </strong>{' '}
              sang{' '}
              <strong>
                {action.parent
                  ? parentOptions.find((item) => item.category.id === action.parent?.id)?.path
                  : 'Cấp gốc'}
              </strong>
              ?
            </p>
            <p>
              Các danh mục con và sản phẩm vẫn thuộc nhánh này. Thay đổi chỉ được lưu khi bạn xác
              nhận.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-600">
            <p className="break-words">
              Bạn muốn xóa danh mục <strong>{action.category.name}</strong>?
            </p>
            <p>Chỉ xóa được danh mục không có danh mục con và không có sản phẩm liên kết.</p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={close}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant={action.kind === 'delete' ? 'danger' : 'primary'}
            disabled={pending}
          >
            {pending
              ? 'Đang xử lý…'
              : action.kind === 'move'
                ? 'Xác nhận chuyển'
                : isEdit
                  ? 'Lưu thay đổi'
                  : title}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
