import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/roles.decorator';
import { ShippingAddressDto } from '../dtos/checkout.dto';
import { AuctionCheckoutService } from '../services/auction-checkout.service';

/** Winner-only checkout consumes the held bid; ordinary retail payment must not charge it again. */
@Controller('commerce/auction-awards')
@ApiTags('Auction checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AuctionCheckoutController {
  constructor(private readonly checkoutService: AuctionCheckoutService) {}

  /** Lists the current buyer's offers. @returns The owned offers and their orders. */
  @Get()
  @ApiOperation({ summary: 'Các quyền mua thắng đấu giá của tôi' })
  list(@CurrentUser('id') userId: string): ReturnType<AuctionCheckoutService['list']> {
    return this.checkoutService.list(userId);
  }

  /** Completes an owned offer. @returns Paid order with shipping and escrow. */
  @Post(':id/checkout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Xác nhận địa chỉ, tính phí GHN và thanh toán phần còn thiếu trong 24 giờ',
  })
  checkout(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @Body() address: ShippingAddressDto,
  ): ReturnType<AuctionCheckoutService['checkout']> {
    return this.checkoutService.checkout(id, userId, address);
  }

  /** Declines an owned offer. @returns Completion after deposit recovery and the next offer. */
  @Post(':id/decline')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Từ chối quyền mua và hoàn tiền cọc; người thắng ban đầu bị trừ 10 điểm',
  })
  decline(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.checkoutService.expire(id, userId);
  }
}
