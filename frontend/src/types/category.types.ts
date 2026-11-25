export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId: string | null;
  children?: CategoryTreeItem[];
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  parentId?: string | null;
}

export interface DeleteCategoryResult {
  success: boolean;
  message: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;
