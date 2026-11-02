import type { CategoryTreeItem } from '../types/category.types';

export function flattenCategories(
  items: CategoryTreeItem[],
  prefix = '',
): {
  category: CategoryTreeItem;
  path: string;
}[] {
  return items.flatMap((category) => {
    const path = prefix ? `${prefix} / ${category.name}` : category.name;
    return [{ category, path }, ...flattenCategories(category.children ?? [], path)];
  });
}

function subtreeDepth(category: CategoryTreeItem): number {
  return 1 + Math.max(0, ...(category.children ?? []).map(subtreeDepth));
}

export function categoryMoveError(
  category: CategoryTreeItem,
  parent: CategoryTreeItem | null,
): string | null {
  if (parent && flattenCategories([category]).some((item) => item.category.id === parent.id)) {
    return 'Không thể chuyển danh mục vào chính nó hoặc danh mục con của nó.';
  }
  if ((parent?.level ?? 0) + subtreeDepth(category) > 3) {
    return 'Không thể chuyển vì cả nhánh danh mục sẽ vượt quá 3 cấp.';
  }
  return null;
}
