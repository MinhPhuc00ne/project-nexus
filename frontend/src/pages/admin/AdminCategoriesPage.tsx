import CategoryNode from '../../components/adminDashboard/Categories/CategoryNode';
import { useEffect, useRef, useState } from 'react';
import { useCategoryDragScroll } from '../../components/adminDashboard/Categories/useCategoryDragScroll';
import { FolderTree, Plus, RefreshCw, Search } from 'lucide-react';
import { categoryMoveError } from '../../utils/category-tree';
import { Button, EmptyState, Panel } from '../../components/adminDashboard/shared/AdminUI';
import CategoryDialogs, {
  type CategoryAction,
} from '../../components/adminDashboard/Categories/CategoryDialogs';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ToastNotification';
import { getCategoryTree } from '../../services/admin';
import type { CategoryTreeItem } from '../../types/category.types';

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<CategoryAction | null>(null);
  const [dragged, setDragged] = useState<CategoryTreeItem | null>(null);
  const [dropError, setDropError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollBounds = useCategoryDragScroll(!!dragged, containerRef);

  const dropCategory = (parent: CategoryTreeItem | null) => {
    if (!dragged) return;
    setDragged(null);
    if (dragged.parentId === (parent?.id ?? null)) {
      setDropError(
        parent ? `Danh mục này đã thuộc "${parent.name}".` : 'Danh mục này đã ở cấp gốc.',
      );
      return;
    }
    const reason = categoryMoveError(dragged, parent);
    if (reason) {
      setDropError(reason);
      return;
    }
    openAction({ kind: 'move', category: dragged, parent });
  };

  const openAction = (next: CategoryAction) => {
    setDropError('');
    setAction(next);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void getCategoryTree(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setCategories(items);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải danh mục.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  return (
    <div ref={containerRef}>
      {scrollBounds && (
        <>
          <div
            className="pointer-events-none fixed z-40 rounded-lg bg-blue-100/95 py-2 text-center text-xs font-semibold text-primary shadow"
            style={{
              top: scrollBounds.top + 6,
              left: scrollBounds.left + 12,
              width: scrollBounds.width - 24,
            }}
          >
            ↑ Giữ danh mục gần mép trên để tự cuộn lên
          </div>
          <div
            className="pointer-events-none fixed z-40 rounded-lg bg-blue-100/95 py-2 text-center text-xs font-semibold text-primary shadow"
            style={{
              top: scrollBounds.bottom - 40,
              left: scrollBounds.left + 12,
              width: scrollBounds.width - 24,
            }}
          >
            ↓ Giữ danh mục gần mép dưới để tự cuộn xuống
          </div>
        </>
      )}
      <Panel
        title="Danh mục hàng hóa"
        subtitle="Xem cây danh mục sản phẩm. Bấm vào danh mục cha để mở hoặc thu gọn các danh mục con."
        icon={<FolderTree size={19} />}
        className="[&>div:first-child]:flex-wrap [&>div:first-child]:gap-4"
        action={
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <div className="relative min-w-40 flex-1 sm:w-64 sm:flex-none">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                type="search"
                aria-label="Tìm kiếm danh mục"
                placeholder="Tìm kiếm danh mục..."
                className="bg-slate-50 pl-9 text-xs"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              aria-label="Thêm danh mục"
              title="Thêm danh mục"
              onClick={() => openAction({ kind: 'create', parent: null })}
            >
              <Plus size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => setRevision((value) => value + 1)}
            >
              <RefreshCw size={14} aria-hidden="true" /> Làm mới
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          Kéo biểu tượng ⋮⋮ rồi thả vào danh mục cha mới; xác nhận để lưu. Dùng nút bút chì để sửa
          bằng bàn phím hoặc trên điện thoại.
        </p>
        {dropError && (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {dropError}
          </p>
        )}
        {!loading && !error && (
          <div
            onDragOver={(event) => {
              if (dragged) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              dropCategory(null);
            }}
            className={`mb-4 rounded-lg border border-dashed p-3 text-center text-xs ${dragged ? 'border-blue-400 bg-blue-50 text-primary' : 'border-slate-200 text-slate-500'}`}
          >
            Thả vào đây để chuyển thành danh mục gốc (cấp 1)
          </div>
        )}
        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            Đang tải danh mục…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState text="Chưa có danh mục sản phẩm." />
        ) : (
          <div role="region" aria-label="Cây danh mục sản phẩm">
            <ul aria-label="Danh mục gốc" className="space-y-2">
              {categories.map((category) => (
                <CategoryNode
                  key={category.id}
                  category={category}
                  onAction={openAction}
                  dragged={dragged}
                  onDrag={setDragged}
                  onDropCategory={dropCategory}
                />
              ))}
            </ul>
          </div>
        )}
        {action && (
          <CategoryDialogs
            action={action}
            categories={categories}
            onClose={() => setAction(null)}
            onSuccess={(text) => {
              setAction(null);
              toast.success(text);
              setRevision((value) => value + 1);
            }}
          />
        )}
      </Panel>
    </div>
  );
}
