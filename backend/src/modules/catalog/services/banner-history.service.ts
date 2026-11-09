import { BadRequestException, Injectable } from '@nestjs/common';
import { BannerCreatorRole, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BannerHistoryPageDto, QueryBannerHistoryDto } from '../dtos/banner-history.dto';

/** Authenticated account read within the mutation transaction. */
export interface BannerActor {
  id: string;
  fullName: string;
  role: Role;
}

/** Original banner attribution captured before the deactivation takes effect. */
export interface DisabledBannerSnapshot {
  id: string;
  title: string;
  creatorId: string;
  creatorRole: BannerCreatorRole;
  creator: { fullName: string };
}

/** Stores completed disable actions and exposes read-only history to every authorized manager. */
@Injectable()
export class BannerHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records one real active-to-inactive transition while the caller holds the banner row lock.
   * @param tx Shared transaction for state, history, and administrator notifications.
   * @param input Immutable banner snapshot and authenticated operator.
   * @returns Completion after history and required notifications are persisted.
   */
  async record(
    tx: Prisma.TransactionClient,
    input: {
      banner: DisabledBannerSnapshot;
      actor: BannerActor;
      source: 'UPDATE' | 'DELETE' | 'DISABLE';
    },
  ): Promise<void> {
    const { banner, actor, source } = input;
    const history = await tx.bannerDisableHistory.create({
      data: {
        bannerId: banner.id,
        bannerTitle: banner.title,
        creatorId: banner.creatorId,
        creatorName: banner.creator.fullName,
        creatorRole: banner.creatorRole,
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        source,
      },
    });
    if (actor.role !== Role.SUPPORT_STAFF) return;
    const admins = await tx.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
    if (!admins.length) return;
    await tx.notification.createMany({
      data: admins.map(({ id }) => ({
        userId: id,
        type: 'SYSTEM' as const,
        channel: 'IN_APP' as const,
        title: 'Staff đã tắt banner',
        content: `${actor.fullName} (${actor.id}) đã tắt banner "${banner.title}" (${banner.id}) của ${banner.creator.fullName} lúc ${history.createdAt.toISOString()}. Mã lịch sử: ${history.id}.`,
        targetUrl: '/admin/banners',
      })),
    });
  }

  /**
   * Reads all matching audit records without restricting results to the requesting staff member.
   * @param query Validated banner, actor, date, and pagination filters.
   * @returns Snapshot records and total count from the same database snapshot.
   * @throws BadRequestException when the date range is reversed.
   */
  async list(query: QueryBannerHistoryDto): Promise<BannerHistoryPageDto> {
    if (query.from && query.to && new Date(query.from) > new Date(query.to))
      throw new BadRequestException('Thời gian bắt đầu phải trước thời gian kết thúc.');
    const where: Prisma.BannerDisableHistoryWhereInput = {
      bannerId: query.bannerId,
      actorId: query.actorId,
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };
    return this.prisma.$transaction(
      async (tx) => {
        const [items, total] = await Promise.all([
          tx.bannerDisableHistory.findMany({
            where,
            take: query.limit,
            skip: (query.page - 1) * query.limit,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          }),
          tx.bannerDisableHistory.count({ where }),
        ]);
        return { items, total, page: query.page, limit: query.limit };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
