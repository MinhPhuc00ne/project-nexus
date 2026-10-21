import { useEffect, useState } from 'react';
import { FolderTree, Plus, RefreshCw, Search, Tag } from 'lucide-react';
import { Badge, Button, EmptyState, Panel } from '../../components/adminDashboard/AdminUI';
import { Input } from '../../components/ui/input';
import { getCategoryTree } from '../../services/admin';
import type { CategoryTreeItem } from '../../types/category.types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

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
        <div
          role="region"
          aria-label="Cây danh mục sản phẩm"
          tabIndex={0}
          className="max-h-[60dvh] overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]"
        >
          <ul aria-label="Danh mục gốc" className="space-y-2">
            {categories.map((category) => (
              <CategoryNode key={category.id} category={category} />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function CategoryNode({ category }: { category: CategoryTreeItem }) {
  const children = category.children ?? [];
  const canAddChild = category.level === 1 || category.level === 2;
  const label = (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 align-middle">
      <Tag size={14} className="shrink-0 text-primary" aria-hidden="true" />
      <span className="break-words text-sm font-semibold text-slate-800">{category.name}</span>
      <Badge tone="gray">Cấp {category.level}</Badge>
      <span className="break-all text-xs text-slate-500">{category.slug}</span>
    </span>
  );

  return (
    <li className="relative min-w-0 rounded-lg border border-slate-200 bg-white">
      {canAddChild && (
        <Button
          type="button"
          variant="secondary"
          aria-label={`Thêm danh mục con cho ${category.name}`}
          title="Thêm danh mục con"
          className="absolute right-2 top-1 z-10"
        >
          <Plus size={16} aria-hidden="true" />
        </Button>
      )}
      {children.length > 0 ? (
        <details open>
          <summary
            className={`cursor-pointer rounded-lg bg-slate-50 p-3 focus-visible:outline-blue-600 ${canAddChild ? 'pr-16' : ''}`}
          >
            {label}
          </summary>
          <ul
            aria-label={`Danh mục con của ${category.name}`}
            className="m-3 ml-4 space-y-2 border-l border-blue-100 pl-3 sm:ml-6"
          >
            {children.map((child) => (
              <CategoryNode key={child.id} category={child} />
            ))}
          </ul>
        </details>
      ) : (
        <div className={`p-3 ${canAddChild ? 'pr-16' : ''}`}>{label}</div>
      )}
    </li>
  );
}
