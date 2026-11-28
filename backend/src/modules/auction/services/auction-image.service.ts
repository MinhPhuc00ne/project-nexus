import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/** Allows staff to maintain session images without granting auction pricing or schedule access. */
@Injectable()
export class AuctionImageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Changes an upcoming auction image while serializing against lifecycle transitions.
   * @param actorId Authenticated administrator or staff identifier.
   * @param auctionId Session identifier.
   * @param imageUrl Validated uploaded image URL.
   * @returns The session identifier and persisted image URL.
   * @throws ForbiddenException if the account lacks management privileges.
   * @throws NotFoundException if the session does not exist.
   * @throws BadRequestException if the session is no longer upcoming.
   */
  async update(
    actorId: string,
    auctionId: string,
    imageUrl: string,
  ): Promise<{ id: string; imageUrl: string | null }> {
    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (!actor || !['ADMIN', 'SUPPORT_STAFF'].includes(actor.role))
        throw new ForbiddenException('Only Admin or Staff may update auction images.');
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
      const auction = await tx.auction.findUnique({ where: { id: auctionId } });
      if (!auction) throw new NotFoundException('Auction not found.');
      if (
        !['DRAFT', 'SCHEDULED'].includes(auction.status) ||
        (auction.status === 'SCHEDULED' && auction.startTime <= new Date())
      )
        throw new BadRequestException(
          'Can only change the image of an auction that has not started.',
        );
      return tx.auction.update({
        where: { id: auctionId },
        data: { imageUrl },
        select: { id: true, imageUrl: true },
      });
    });
  }
}
