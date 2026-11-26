import i18n from '../i18n';
import type { CategoryTreeItem } from '@/features/catalog/types/category.types';

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
    return i18n.t('errors:services.categoryMoveSelfOrChild');
  }
  if ((parent?.level ?? 0) + subtreeDepth(category) > 3) {
    return i18n.t('errors:services.categoryMoveMaxDepth');
  }
  return null;
}
