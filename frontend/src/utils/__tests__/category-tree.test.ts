import { describe, expect, it, beforeEach } from 'vitest';
import i18n from '../../i18n';
import type { CategoryTreeItem } from '../../types/category.types';
import { categoryMoveError, flattenCategories } from '../category-tree';

const tree: CategoryTreeItem[] = [
  {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    level: 1,
    parentId: null,
    children: [
      {
        id: 'cat-1-1',
        name: 'Audio',
        slug: 'audio',
        level: 2,
        parentId: 'cat-1',
        children: [
          {
            id: 'cat-1-1-1',
            name: 'Headphones',
            slug: 'headphones',
            level: 3,
            parentId: 'cat-1-1',
            children: [],
          },
        ],
      },
    ],
  },
];

describe('category-tree utilities', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('flattens nested category hierarchy with breadcrumb paths', () => {
    const flat = flattenCategories(tree);
    expect(flat.map((item) => item.path)).toEqual([
      'Electronics',
      'Electronics / Audio',
      'Electronics / Audio / Headphones',
    ]);
  });

  it('rejects moving a category into itself or one of its descendants', () => {
    const root = tree[0];
    const child = root.children![0];
    expect(categoryMoveError(root, root)).toBe(i18n.t('errors:services.categoryMoveSelfOrChild'));
    expect(categoryMoveError(root, child)).toBe(i18n.t('errors:services.categoryMoveSelfOrChild'));
  });

  it('rejects moves that would exceed 3 category levels', () => {
    const deepParent: CategoryTreeItem = {
      id: 'cat-p',
      name: 'Parent L2',
      slug: 'parent-l2',
      level: 2,
      parentId: 'root',
      children: [],
    };
    const twoLevelSubtree = tree[0].children![0];
    expect(categoryMoveError(twoLevelSubtree, deepParent)).toBe(
      i18n.t('errors:services.categoryMoveMaxDepth'),
    );
  });

  it('allows valid moves within depth limit', () => {
    const leaf = tree[0].children![0].children![0];
    const targetParent: CategoryTreeItem = {
      id: 'cat-other',
      name: 'Other L2',
      slug: 'other-l2',
      level: 2,
      parentId: 'root',
      children: [],
    };
    expect(categoryMoveError(leaf, targetParent)).toBeNull();
    expect(categoryMoveError(leaf, null)).toBeNull();
  });
});
