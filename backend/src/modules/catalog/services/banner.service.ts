import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BannerCreatorRole, EventBanner, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { auctionTargetUrl } from '../../../core/navigation/auction-navigation';
import { BannerDto } from '../dtos/banner.dto';
import { BannerResponseDto } from '../dtos/banner-response.dto';
import { BannerActor, BannerHistoryService } from './banner-history.service';

/** Owns banner content, immutable creator ordering, and atomic deactivation workflows. */
@Injectable()
export class BannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: BannerHistoryService,
  ) {}

  /**
   * Returns administrator-created banners first, newest first within each creator group.
   * @param publicOnly Restrict results to active banners inside their publication window.
   * @returns Up to one hundred banners after ordering in the database.
   */
  async list(publicOnly: boolean): Promise<BannerResponseDto[]> {
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
      orderBy: [{ creatorRole: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        imageUrl: true,
        targetUrl: true,
        auctionId: true,
        creatorRole: true,
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

  /**
   * Creates or edits content without changing the original creator group or creation timestamp.
   * @param actorId Authenticated editor identifier, never supplied in the body.
   * @param dto Validated publication content and optional auction association.
   * @param id Existing banner identifier when editing.
   * @returns Persisted banner with a canonical destination for linked auctions.
   * @throws BadRequestException for reversed dates or a nonpublic auction.
   * @throws ForbiddenException if the editor no longer has management privileges.
   * @throws NotFoundException if the banner or linked auction does not exist.
   */
  async save(actorId: string, dto: BannerDto, id?: string): Promise<EventBanner> {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && startsAt >= endsAt)
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    return this.prisma.$transaction(async (tx) => {
      if (id) await tx.$queryRaw`SELECT id FROM event_banners WHERE id = ${id} FOR UPDATE`;
      const current = id
        ? await tx.eventBanner.findUnique({
            where: { id },
            include: { creator: { select: { fullName: true } } },
          })
        : null;
      if (id && !current) throw new NotFoundException('Không tìm thấy banner.');
      const actor = await this.getActor(tx, actorId);
      const auctionId = dto.auctionId === undefined ? (current?.auctionId ?? null) : dto.auctionId;
      if (auctionId && (!current || current.auctionId !== auctionId || dto.isActive === true)) {
        const auction = await tx.auction.findUnique({
          where: { id: auctionId },
          select: { status: true },
        });
        if (!auction) throw new NotFoundException('Không tìm thấy phiên đấu giá.');
        if (['DRAFT', 'CANCELLED'].includes(auction.status))
          throw new BadRequestException('Banner chỉ được dẫn tới phiên đấu giá công khai.');
      }
      const data = {
        title: dto.title.trim(),
        imageUrl: dto.imageUrl,
        targetUrl: auctionId ? auctionTargetUrl(auctionId) : (dto.targetUrl ?? null),
        auctionId,
        startsAt,
        endsAt,
        isActive: dto.isActive ?? current?.isActive ?? true,
        priority: dto.priority ?? current?.priority ?? 0,
      };
      if (!current)
        return tx.eventBanner.create({
          data: {
            ...data,
            creatorId: actor.id,
            creatorRole:
              actor.role === Role.ADMIN ? BannerCreatorRole.ADMIN : BannerCreatorRole.STAFF,
          },
        });
      const updated = await tx.eventBanner.update({ where: { id: current.id }, data });
      if (current.isActive && !updated.isActive)
        await this.history.record(tx, { banner: current, actor, source: 'UPDATE' });
      return updated;
    });
  }

  /**
   * Immediately deactivates any creator's banner and records an actual transition once.
   * @param id Banner identifier.
   * @param actorId Authenticated operator identifier.
   * @param source HTTP action retained for audit attribution.
   * @returns Success for a completed transition or an already inactive banner.
   * @throws NotFoundException when no such banner exists.
   */
  async remove(
    id: string,
    actorId: string,
    source: 'DELETE' | 'DISABLE' = 'DELETE',
  ): Promise<{ success: true }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event_banners WHERE id = ${id} FOR UPDATE`;
      const banner = await tx.eventBanner.findUnique({
        where: { id },
        include: { creator: { select: { fullName: true } } },
      });
      if (!banner) throw new NotFoundException('Không tìm thấy banner.');
      const actor = await this.getActor(tx, actorId);
      if (!banner.isActive) return { success: true };
      await tx.eventBanner.update({ where: { id }, data: { isActive: false } });
      await this.history.record(tx, { banner, actor, source });
      return { success: true };
    });
  }

  /**
   * Rechecks the editor role against persisted account state inside the write transaction.
   * @param tx Current transaction.
   * @param actorId Authenticated account identifier.
   * @returns Account identity used for immutable history snapshots.
   * @throws ForbiddenException when the account is missing or lacks banner privileges.
   */
  private async getActor(tx: Prisma.TransactionClient, actorId: string): Promise<BannerActor> {
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { id: true, fullName: true, role: true },
    });
    if (!actor || (actor.role !== Role.ADMIN && actor.role !== Role.SUPPORT_STAFF))
      throw new ForbiddenException('Chỉ Admin hoặc Staff được quản lý banner.');
    return actor;
  }
}
