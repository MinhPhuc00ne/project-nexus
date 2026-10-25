import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useCategoryDragScroll } from './useCategoryDragScroll';
import {
  FolderTree,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { categoryMoveError } from '../../../utils/category-tree';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import CategoryDialogs, { type CategoryAction } from './CategoryDialogs';
import { Input } from '../../ui/input';
import { useToast } from '../../ToastNotification';
import { getCategoryTree } from '../../../services/admin';
import type { CategoryTreeItem } from '../../../types/category.types';

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

function CategoryNode({
  category,
  onAction,
  dragged,
  onDrag,
  onDropCategory,
}: {
  category: CategoryTreeItem;
  onAction: (action: CategoryAction) => void;
  dragged: CategoryTreeItem | null;
  onDrag: (category: CategoryTreeItem | null) => void;
  onDropCategory: (parent: CategoryTreeItem | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const children = category.children ?? [];
  const canAddChild = category.level === 1 || category.level === 2;
  const moveError = dragged ? categoryMoveError(dragged, category) : null;
  const sameParent = dragged?.parentId === category.id;
  const canDrop = dragged && !sameParent && !moveError;
  const dropProps = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.stopPropagation();
      if (dragged) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (
        !(event.relatedTarget instanceof Element) ||
        event.relatedTarget.closest('li') !== event.currentTarget
      ) {
        setDragOver(false);
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
      onDropCategory(category);
    },
  };
  const label = (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 align-middle">
      <Tag size={14} className="shrink-0 text-primary" aria-hidden="true" />
      <span className="break-words text-sm font-semibold text-slate-800">{category.name}</span>
      <Badge tone="gray">Cấp {category.level}</Badge>
      <span className="break-all text-xs text-slate-500">{category.slug}</span>
      {dragged && dragOver && (
        <span className={`w-full text-xs ${canDrop ? 'text-blue-700' : 'text-red-700'}`}>
          {moveError ||
            (sameParent
              ? 'Danh mục này đã nằm trong mục cha này.'
              : `Thả để chuyển vào "${category.name}" (cấp ${category.level + 1}), rồi xác nhận.`)}
        </span>
      )}
    </span>
  );

  return (
    <li
      {...dropProps}
      className={`relative min-w-0 rounded-lg border bg-white ${dragged && dragOver ? (canDrop ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-red-300 ring-2 ring-red-100') : 'border-slate-200'}`}
    >
      <div className="flex justify-end gap-1 px-2 pt-2 sm:absolute sm:right-2 sm:top-2 sm:z-10 sm:p-0">
        <Button
          type="button"
          variant="secondary"
          draggable
          aria-label={`Kéo để chuyển danh mục ${category.name}`}
          title="Kéo để đổi danh mục cha; hoặc dùng nút sửa"
          className="cursor-grab active:cursor-grabbing"
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.setData('text/plain', category.id);
            event.dataTransfer.effectAllowed = 'move';
            onDrag(category);
          }}
          onDragEnd={() => {
            onDrag(null);
            setDragOver(false);
          }}
        >
          <GripVertical size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label={`Sửa danh mục ${category.name}`}
          title="Sửa danh mục"
          onClick={() => onAction({ kind: 'edit', category })}
        >
          <Pencil size={16} aria-hidden="true" />
        </Button>
        {canAddChild && (
          <Button
            type="button"
            variant="secondary"
            aria-label={`Thêm danh mục con cho ${category.name}`}
            title="Thêm danh mục con"
            onClick={() => onAction({ kind: 'create', parent: category })}
          >
            <Plus size={16} aria-hidden="true" />
          </Button>
        )}
        <Button
          type="button"
          variant="danger"
          aria-label={`Xóa danh mục ${category.name}`}
          title={children.length > 0 ? 'Cần xóa hoặc chuyển danh mục con trước' : 'Xóa danh mục'}
          disabled={children.length > 0}
          onClick={() => onAction({ kind: 'delete', category })}
        >
          <Trash2 size={16} aria-hidden="true" />
        </Button>
      </div>
      {children.length > 0 ? (
        <details open>
          <summary className="min-h-14 cursor-pointer rounded-lg bg-slate-50 p-3 sm:pr-52 focus-visible:outline-blue-600">
            {label}
          </summary>
          <ul
            aria-label={`Danh mục con của ${category.name}`}
            className="m-3 ml-4 space-y-2 border-l border-blue-100 pl-3 sm:ml-6"
          >
            {children.map((child) => (
              <CategoryNode
                key={child.id}
                category={child}
                onAction={onAction}
                dragged={dragged}
                onDrag={onDrag}
                onDropCategory={onDropCategory}
              />
            ))}
          </ul>
        </details>
      ) : (
        <div className="min-h-14 p-3 sm:pr-52">{label}</div>
      )}
    </li>
  );
}
