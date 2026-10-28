import { Body, Controller, Get, Param, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CurrentUser, AuthenticatedUserPayload } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import {
  ShipmentTrackingService,
  TrackingResult,
} from '../../fulfillment/services/shipment-tracking.service';
import { OrderEscrowService, EscrowResult } from '../services/order-escrow.service';

class DisputeOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}

class ResolveOrderDto extends DisputeOrderDto {
  @ApiProperty({ enum: ['BUYER', 'SELLER'] })
  @IsIn(['BUYER', 'SELLER'])
  verdict!: 'BUYER' | 'SELLER';
}

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
    @Body() dto: DisputeOrderDto,
  ): ReturnType<OrderEscrowService['dispute']> {
    return this.escrow.dispute(id, userId, dto.reason);
  }

  @Post(':id/resolve-dispute')
  @HttpCode(200)
  resolve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() dto: ResolveOrderDto,
  ): Promise<EscrowResult> {
    return this.escrow.resolve(id, user, dto.verdict, dto.reason);
  }
}
