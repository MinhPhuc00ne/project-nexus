import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCategoryInput } from '../dtos/create-category.dto';
import { UpdateCategoryInput } from '../dtos/update-category.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  /**
   * Retrieves the complete hierarchical category tree up to 3 tiers deep.
   *
   * @returns Array of root CategoryTreeItem elements with nested children
   */
  async getCategoryTree(): Promise<CategoryTreeItem[]> {
    const allCategories = await this.prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    const categoryMap = new Map<string, CategoryTreeItem>();
    const rootCategories: CategoryTreeItem[] = [];

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

  /**
   * Creates a new category supporting parent-child hierarchy up to 3 tiers.
   *
   * @param dto - Category creation payload
   * @returns Created category entity
   * @throws ConflictException when name is duplicated
   * @throws NotFoundException when parentId does not exist
   * @throws BadRequestException when parent level exceeds 2
   */
  async createCategory(dto: CreateCategoryInput, adminId?: string) {
    const name = dto.name.trim();

    const existingName = await this.prisma.category.findFirst({
      where: { name },
    });
    if (existingName) {
      throw new ConflictException(`Category named "${name}" already exists.`);
    }

    let level = 1;
    let parentId: string | null = null;

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category does not exist.');
      }
      if (parent.level >= 3) {
        throw new BadRequestException(
          'Project Nexus supports a maximum category hierarchy depth of 3 levels.',
        );
      }
      level = parent.level + 1;
      parentId = parent.id;
    }

    const baseSlug = dto.slug?.trim() ? this.toSlug(dto.slug) : this.toSlug(name);
    const slug = await this.generateUniqueSlug(baseSlug);

    const category = await this.prisma.category.create({
      data: {
        name,
        slug,
        level,
        parentId,
      },
    });

    await this.auditLog?.record({
      eventName: 'admin.category.created',
      operatorId: adminId ?? null,
      payload: {
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        level: category.level,
        parentId: category.parentId,
      },
    });

    return category;
  }

  /**
   * Updates category attributes and manages subtree re-parenting.
   *
   * @param id - Unique identifier of the category
   * @param dto - Category update payload
   * @returns Updated category entity
   * @throws NotFoundException when category does not exist
   * @throws BadRequestException on self-parenting or depth limit exceeded
   */
  async updateCategory(id: string, dto: UpdateCategoryInput, adminId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    const data: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      level?: number;
    } = {};

    if (dto.name && dto.name.trim() !== category.name) {
      const name = dto.name.trim();
      const existing = await this.prisma.category.findFirst({
        where: { name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Category named "${name}" already exists.`);
      }
      data.name = name;
      if (!dto.slug) {
        data.slug = await this.generateUniqueSlug(this.toSlug(name), id);
      }
    }

    if (dto.slug && dto.slug.trim() !== category.slug) {
      const baseSlug = this.toSlug(dto.slug);
      data.slug = await this.generateUniqueSlug(baseSlug, id);
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent.');
      }

      if (dto.parentId === null) {
        data.parentId = null;
        data.level = 1;
      } else {
        const newParent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
        });
        if (!newParent) {
          throw new NotFoundException('New parent category does not exist.');
        }

        await this.assertNotDescendant(id, dto.parentId);

        const newLevel = newParent.level + 1;
        const maxChildDepth = await this.getMaxSubtreeDepth(id);
        if (newLevel + maxChildDepth - 1 > 3) {
          throw new BadRequestException(
            'Cannot move category because child categories would exceed the 3-level hierarchy limit.',
          );
        }

        data.parentId = newParent.id;
        data.level = newLevel;
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data,
    });

    if (data.level && data.level !== category.level) {
      await this.updateSubtreeLevels(id, data.level);
    }

    await this.auditLog?.record({
      eventName: 'admin.category.updated',
      operatorId: adminId ?? null,
      payload: {
        categoryId: updated.id,
        name: updated.name,
        slug: updated.slug,
        level: updated.level,
        parentId: updated.parentId,
      },
    });

    return updated;
  }

  /**
   * Deletes a category ensuring no child categories or associated products exist.
   *
   * @param id - Unique identifier of the category
   * @returns Success response
   * @throws NotFoundException when category does not exist
   * @throws BadRequestException when category has children or linked products
   */
  async deleteCategory(id: string, adminId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        products: { select: { id: true }, take: 1 },
      },
    });

    if (!category) {
      throw new NotFoundException('Category to delete was not found.');
    }

    if (category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete a category that still has subcategories. Please move or delete the subcategories first.',
      );
    }

    if (category.products.length > 0) {
      throw new BadRequestException(
        'Cannot delete a category that has linked products. Please reassign those products first.',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    await this.auditLog?.record({
      eventName: 'admin.category.deleted',
      operatorId: adminId ?? null,
      payload: {
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
      },
    });

    return {
      success: true,
      message: `Deleted category "${category.name}" successfully.`,
    };
  }

  private toSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let count = 1;
    while (true) {
      const existing = await this.prisma.category.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (!existing) return slug;
      count++;
      slug = `${baseSlug}-${count}`;
    }
  }

  private async assertNotDescendant(currentId: string, targetParentId: string): Promise<void> {
    let checkId: string | null = targetParentId;
    while (checkId) {
      if (checkId === currentId) {
        throw new BadRequestException('Cannot set a descendant category as the parent category.');
      }
      const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: checkId },
        select: { parentId: true },
      });
      checkId = parent?.parentId || null;
    }
  }

  private async getMaxSubtreeDepth(categoryId: string): Promise<number> {
    const children = await this.prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });
    if (children.length === 0) return 1;

    const childDepths = await Promise.all(children.map((c) => this.getMaxSubtreeDepth(c.id)));
    return 1 + Math.max(...childDepths);
  }

  private async updateSubtreeLevels(parentId: string, parentLevel: number): Promise<void> {
    const children = await this.prisma.category.findMany({
      where: { parentId },
      select: { id: true },
    });
    for (const child of children) {
      const childLevel = parentLevel + 1;
      await this.prisma.category.update({
        where: { id: child.id },
        data: { level: childLevel },
      });
      await this.updateSubtreeLevels(child.id, childLevel);
    }
  }
}
