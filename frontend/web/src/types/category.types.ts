export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId: string | null;
  children?: CategoryTreeItem[];
}
