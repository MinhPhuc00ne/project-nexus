import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import {
  createCategory,
  getCategoryTree,
  updateAdminProductCategory,
} from '../../../services/admin';
import { getStoredToken } from '../../../services/auth';
import { useAuth } from '../../../contexts/AuthContext';
import type { AdminProduct } from '../../../types/admin-product.types';
import type { CategoryTreeItem } from '../../../types/category.types';
import { flattenCategories } from '../../../utils/category-tree';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';

function insertCategory(tree: CategoryTreeItem[], category: CategoryTreeItem): CategoryTreeItem[] {
  if (!category.parentId) return [...tree, category];
  return tree.map((item) =>
    item.id === category.parentId
      ? { ...item, children: [...(item.children ?? []), category] }
      : { ...item, children: insertCategory(item.children ?? [], category) },
  );
}

export default function ProductCategoryDialog({
  product,
  onClose,
  onSaved,
  onCategoriesChanged,
}: {
  product: AdminProduct;
  onClose: () => void;
  onSaved: (message: string) => void;
  onCategoriesChanged: () => void;
}) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [categoryId, setCategoryId] = useState(product.category?.id ?? '');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [pending, setPending] = useState<'create' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const mounted = useRef(false);
  const options = flattenCategories(categories);
  const currentSession = () => mounted.current && getStoredToken() === token;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    void getCategoryTree(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCategories(result);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setLoadError(cause instanceof Error ? cause.message : 'Không thể tải danh mục.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, revision]);

  async function addCategory() {
    if (lock.current || loading || loadError) return;
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục mới.');
      return;
    }
    const parent = options.find((entry) => entry.category.id === parentId)?.category;
    if (parentId && (!parent || parent.level >= 3)) {
      setError('Vui lòng chọn danh mục cha cấp 1 hoặc cấp 2.');
      return;
    }
    lock.current = true;
    setPending('create');
    setError('');
    try {
      const created = await createCategory({ name: name.trim(), parentId: parentId || undefined });
      if (currentSession()) {
        setCategories((current) => insertCategory(current, created));
        setCategoryId(created.id);
        setCreating(false);
        setName('');
        setParentId('');
        setNotice(`Đã tạo danh mục “${created.name}”. Nhấn “Lưu danh mục” để gắn vào sản phẩm.`);
        onCategoriesChanged();
      }
    } catch (cause) {
      if (currentSession())
        setError(cause instanceof Error ? cause.message : 'Không thể tạo danh mục.');
    } finally {
      lock.current = false;
      if (currentSession()) setPending(null);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current || loading || loadError || creating) return;
    if (!categoryId || !options.some((entry) => entry.category.id === categoryId)) {
      setError('Vui lòng chọn danh mục hợp lệ cho sản phẩm.');
      return;
    }
    lock.current = true;
    setPending('save');
    setError('');
    try {
      const result = await updateAdminProductCategory(product.id, {
        categoryId,
        reason: reason.trim() || undefined,
      });
      if (!result.success) throw new Error(result.message || 'Không thể cập nhật danh mục.');
      if (currentSession()) onSaved(result.message);
    } catch (cause) {
      if (currentSession())
        setError(cause instanceof Error ? cause.message : 'Không thể cập nhật danh mục.');
    } finally {
      lock.current = false;
      if (currentSession()) setPending(null);
    }
  }

  const inputClass = 'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm';
  return (
    <Popup
      isOpen
      title={product.category ? 'Đổi danh mục sản phẩm' : 'Gắn danh mục sản phẩm'}
      onClose={() => {
        if (!lock.current) onClose();
      }}
      closeOnOverlay={!pending}
      closeOnEsc={!pending}
      showCloseButton={!pending}
    >
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-3 text-sm">
          <p className="break-words font-semibold text-slate-800">{product.title}</p>
          <p className="mt-1 text-slate-600">
            Danh mục hiện tại: {product.category?.name || 'Chưa phân loại'}
          </p>
        </div>
        {loading && (
          <p role="status" className="text-sm text-slate-500">
            Đang tải danh mục…
          </p>
        )}
        {loadError && (
          <div role="alert" className="space-y-2 text-sm text-red-700">
            <p>{loadError}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRevision((value) => value + 1)}
            >
              Thử lại
            </Button>
          </div>
        )}
        <fieldset
          disabled={!!pending || loading || !!loadError}
          className="space-y-4 disabled:opacity-60"
        >
          <label className="block text-sm font-medium">
            Danh mục sản phẩm
            <select
              required
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setError('');
              }}
              className={inputClass}
            >
              <option value="">Chọn danh mục</option>
              {options.map(({ category, path }) => (
                <option key={category.id} value={category.id}>
                  {path}
                </option>
              ))}
            </select>
          </label>
          {!creating ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreating(true);
                setError('');
                setNotice('');
              }}
            >
              <Plus size={15} aria-hidden="true" /> Thêm danh mục mới
            </Button>
          ) : (
            <section
              aria-label="Thêm danh mục mới"
              className="space-y-3 rounded-lg border border-slate-200 p-3"
            >
              <label className="block text-sm font-medium">
                Tên danh mục mới
                <input
                  autoFocus
                  value={name}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-medium">
                Danh mục cha
                <select
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Không có cha (danh mục gốc)</option>
                  {options
                    .filter(({ category }) => category.level < 3)
                    .map(({ category, path }) => (
                      <option key={category.id} value={category.id}>
                        {path}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button type="button" onClick={() => void addCategory()}>
                  {pending === 'create' ? 'Đang tạo…' : 'Tạo và chọn'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCreating(false);
                    setError('');
                  }}
                >
                  Hủy tạo
                </Button>
              </div>
            </section>
          )}
          <label className="block text-sm font-medium">
            Ghi chú cho seller (không bắt buộc)
            <textarea
              value={reason}
              maxLength={500}
              rows={3}
              onChange={(event) => setReason(event.target.value)}
              className={inputClass}
            />
          </label>
        </fieldset>
        {notice && (
          <p role="status" className="text-sm text-emerald-700">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Seller sẽ nhận thông báo khi danh mục sản phẩm thay đổi.
        </p>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" disabled={!!pending} onClick={onClose}>
            Đóng
          </Button>
          <Button
            type="submit"
            disabled={
              !!pending ||
              loading ||
              !!loadError ||
              creating ||
              !categoryId ||
              categoryId === product.category?.id
            }
          >
            {pending === 'save' ? 'Đang lưu…' : 'Lưu danh mục'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
