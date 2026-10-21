import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId: string | null;
  children?: CategoryTreeItem[];
}

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategoryTree(): Promise<CategoryTreeItem[]> {
    const allCategories = await this.prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    const categoryMap = new Map<string, CategoryTreeItem>();
    const rootCategories: CategoryTreeItem[] = [];

    // Map all categories
    for (const cat of allCategories) {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        level: cat.level,
        parentId: cat.parentId,
        children: [],
      });
    }

    // Assemble hierarchy
    for (const cat of allCategories) {
      const item = categoryMap.get(cat.id);
      if (!item) continue;

      if (!cat.parentId) {
        rootCategories.push(item);
      } else {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(item);
        } else {
          rootCategories.push(item);
        }
      }
    }

    return rootCategories;
  }
}
