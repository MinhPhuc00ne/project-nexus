import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Issues the integer PayOS identifies a transfer by.
 *
 * PayOS requires the merchant to choose this number and to never reuse it. Two
 * places chose one and both built it from a clock and a random suffix: checkout
 * from the last six digits of the millisecond plus four random digits, the
 * wallet top-up from unix seconds plus two. Neither can promise uniqueness —
 * two checkouts in the same millisecond collide about one time in ten thousand
 * — and nothing stopped the two paths from choosing the same number, which the
 * callback dispatcher would then settle against whichever record it happened to
 * find first: a top-up could be recorded as payment for somebody's order.
 *
 * A sequence cannot repeat, and it does not care how many instances are asking.
 */
@Injectable()
export class PayosOrderCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Takes the next unused order code.
   *
   * @returns An integer no transfer has used before, within PayOS's range.
   */
  async next(): Promise<number> {
    const [row] = await this.prisma.$queryRaw<
      Array<{ nextval: bigint }>
    >`SELECT nextval('payos_order_code_seq')`;
    return Number(row.nextval);
  }
}
