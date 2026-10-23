import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';

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

  /**
   * Lấy cây phân cấp danh mục tối đa 3 cấp
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
   * Tạo danh mục mới (hỗ trợ phân cấp tối đa 3 tầng)
   */
  async createCategory(dto: CreateCategoryDto) {
    const name = dto.name.trim();

    // Kiểm tra trùng tên
    const existingName = await this.prisma.category.findFirst({
      where: { name },
    });
    if (existingName) {
      throw new ConflictException(`Danh mục có tên "${name}" đã tồn tại.`);
    }

    // Xác định cấp độ (level) và kiểm tra danh mục cha nếu có
    let level = 1;
    let parentId: string | null = null;

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Danh mục cha không tồn tại.');
      }
      if (parent.level >= 3) {
        throw new BadRequestException(
          'Hệ thống Project Nexus chỉ hỗ trợ danh mục phân cấp tối đa 3 tầng.',
        );
      }
      level = parent.level + 1;
      parentId = parent.id;
    }

    // Sinh slug duy nhất
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

    return category;
  }

  /**
   * Cập nhật danh mục & điều chuyển danh mục cha (re-parenting)
   */
  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục.');
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
        throw new ConflictException(`Danh mục có tên "${name}" đã tồn tại.`);
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

    // Xử lý điều chuyển danh mục cha (parentId)
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Danh mục không thể làm cha của chính nó.');
      }

      if (dto.parentId === null) {
        data.parentId = null;
        data.level = 1;
      } else {
        const newParent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
        });
        if (!newParent) {
          throw new NotFoundException('Danh mục cha mới không tồn tại.');
        }

        // Kiểm tra vòng lặp: danh mục cha mới không được là con/cháu của danh mục hiện tại
        await this.assertNotDescendant(id, dto.parentId);

        const newLevel = newParent.level + 1;
        const maxChildDepth = await this.getMaxSubtreeDepth(id);
        if (newLevel + maxChildDepth - 1 > 3) {
          throw new BadRequestException(
            'Không thể chuyển danh mục vì các danh mục con bên dưới sẽ vượt quá giới hạn 3 cấp.',
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

    // Nếu level thay đổi, cập nhật lại level cho toàn bộ cây con bên dưới
    if (data.level && data.level !== category.level) {
      await this.updateSubtreeLevels(id, data.level);
    }

    return updated;
  }

  /**
   * Xóa danh mục (kèm ràng buộc kiểm tra an toàn)
   */
  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        products: { select: { id: true }, take: 1 },
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục cần xóa.');
    }

    if (category.children.length > 0) {
      throw new BadRequestException(
        'Không thể xóa danh mục đang có danh mục con. Vui lòng chuyển hoặc xóa các danh mục con trước.',
      );
    }

    if (category.products.length > 0) {
      throw new BadRequestException(
        'Không thể xóa danh mục đang có sản phẩm liên kết. Vui lòng chuyển sản phẩm sang danh mục khác trước.',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      success: true,
      message: `Đã xóa danh mục "${category.name}" thành công.`,
    };
  }

  // --- Helper Methods ---

  private toSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
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
        throw new BadRequestException(
          'Không thể đặt danh mục cha là một danh mục con/cháu của chính nó.',
        );
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
