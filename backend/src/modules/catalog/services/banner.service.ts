import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BannerDto } from '../dtos/banner.dto';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(publicOnly: boolean): Promise<unknown> {
    const now = new Date();
    return this.prisma.eventBanner.findMany({
      where: publicOnly
        ? {
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            ],
          }
        : {},
      take: 100,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        imageUrl: true,
        targetUrl: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        ...(!publicOnly && {
          creatorId: true,
          creator: { select: { id: true, fullName: true, role: true } },
        }),
      },
    });
  }

  async save(creatorId: string, dto: BannerDto, id?: string): Promise<unknown> {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && startsAt >= endsAt)
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    const data = {
      title: dto.title.trim(),
      imageUrl: dto.imageUrl,
      targetUrl: dto.targetUrl ?? null,
      startsAt,
      endsAt,
      isActive: dto.isActive ?? true,
      priority: dto.priority ?? 0,
    };
    if (!id) return this.prisma.eventBanner.create({ data: { ...data, creatorId } });
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.eventBanner.findUnique({ where: { id }, select: { id: true } })))
        throw new NotFoundException('Không tìm thấy banner.');
      return tx.eventBanner.update({ where: { id }, data });
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    const result = await this.prisma.eventBanner.updateMany({
      where: { id },
      data: { isActive: false },
    });
    if (!result.count) throw new NotFoundException('Không tìm thấy banner.');
    return { success: true };
  }
}
