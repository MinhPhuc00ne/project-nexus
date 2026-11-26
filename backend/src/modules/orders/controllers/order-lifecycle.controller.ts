import { Controller, Get, Param, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodBody } from '@nexus/contracts/nest';
import { z } from 'zod';
import { CurrentUser, AuthenticatedUserPayload } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import {
  ShipmentTrackingService,
  TrackingResult,
} from '../../fulfillment/services/shipment-tracking.service';
import { OrderEscrowService, EscrowResult } from '../services/order-escrow.service';

/** Why a buyer is disputing an order. Trimmed, so a reason of spaces is none. */
const DisputeOrderSchema = z.object({ reason: z.string().trim().min(1).max(2000) }).strict();

/** A staff ruling on a dispute, and the reasoning behind it. */
const ResolveOrderSchema = z
  .object({
    reason: z.string().trim().min(1).max(2000),
    verdict: z.enum(['BUYER', 'SELLER']),
  })
  .strict();

type DisputeOrderInput = z.infer<typeof DisputeOrderSchema>;
type ResolveOrderInput = z.infer<typeof ResolveOrderSchema>;

@ApiTags('8. COMMERCE - ORDERS & PAYMENTS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commerce/orders')
export class OrderLifecycleController {
  constructor(
    private readonly tracking: ShipmentTrackingService,
    private readonly escrow: OrderEscrowService,
  ) {}

  @Get(':id/tracking')
  trackingView(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ): Promise<TrackingResult> {
    return this.tracking.view(id, user);
  }

  @Post(':id/tracking/sync')
  @HttpCode(200)
  sync(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ): Promise<TrackingResult> {
    return this.tracking.refresh(id, user);
  }

  @Post(':id/confirm-delivery')
  @HttpCode(200)
  async confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ): Promise<EscrowResult> {
    const current = await this.tracking.view(id, user);
    if (current.orderStatus !== 'CONFIRMED') await this.tracking.refresh(id, user);
    return this.escrow.confirmDelivery(id, user.id);
  }

  @Post(':id/dispute')
  dispute(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @ZodBody(DisputeOrderSchema) dto: DisputeOrderInput,
  ): ReturnType<OrderEscrowService['dispute']> {
    return this.escrow.dispute(id, userId, dto.reason);
  }

  @Post(':id/resolve-dispute')
  @HttpCode(200)
  resolve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @ZodBody(ResolveOrderSchema) dto: ResolveOrderInput,
  ): Promise<EscrowResult> {
    return this.escrow.resolve(id, user, dto.verdict, dto.reason);
  }
}
