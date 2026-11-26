import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { TreasuryService } from './services/treasury.service';

/**
 * The platform's own wallet, on its own.
 *
 * Orders, escrow, refunds and auction deposits each imported `AdminModule` to
 * reach one method on the admin finance service, which made the back office a
 * dependency of every money flow. They import this instead.
 */
@Module({
  imports: [PrismaModule],
  providers: [TreasuryService],
  exports: [TreasuryService],
})
export class TreasuryModule {}
