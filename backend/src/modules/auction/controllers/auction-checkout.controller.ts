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
import { ZodBody } from '@nexus/contracts/nest';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/roles.decorator';
import {
  CheckoutAuctionAwardInput,
  CheckoutAuctionAwardSchema,
} from '../dtos/checkout-auction-award.dto';
import { RespondSecondChanceDto } from '../dtos/respond-second-chance.dto';
import { AuctionCheckoutService } from '../services/auction-checkout.service';

/** Winner-only checkout consumes the held 30% deposit + 70% remaining balance and GHN shipping. */
@Controller('commerce/auction-awards')
@ApiTags('Auction checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AuctionCheckoutController {
  constructor(private readonly checkoutService: AuctionCheckoutService) {}

  /** Lists the current buyer's active or paid auction awards. @returns The owned awards and orders. */
  @Get()
  @ApiOperation({ summary: 'Danh sách quyền mua và đơn thắng đấu giá của tôi' })
  list(@CurrentUser('id') userId: string): ReturnType<AuctionCheckoutService['list']> {
    return this.checkoutService.list(userId);
  }

  /** Quotes GHN shipping and the remaining 70% payment due at checkout. */
  @Post(':id/quote')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Báo giá phí vận chuyển GHN và số tiền 70% còn lại cần thanh toán',
  })
  quote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @ZodBody(CheckoutAuctionAwardSchema) dto: CheckoutAuctionAwardInput,
  ): ReturnType<AuctionCheckoutService['quote']> {
    return this.checkoutService.quote(id, userId, dto);
  }

  /** Completes an owned award in AWAITING_CHECKOUT. @returns Paid order with shipping and escrow. */
  @Post(':id/checkout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Xác nhận địa chỉ, tính phí GHN và thanh toán 70% còn lại trong 24 giờ',
  })
  checkout(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @ZodBody(CheckoutAuctionAwardSchema) dto: CheckoutAuctionAwardInput,
  ): ReturnType<AuctionCheckoutService['checkout']> {
    return this.checkoutService.checkout(id, userId, dto);
  }

  /** Second-chance buyer confirms or declines the purchase offer from notification or award list. */
  @Post(':id/respond')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Người mua thứ hai xác nhận đồng ý hoặc từ chối quyền mua món hàng đấu giá',
  })
  respond(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RespondSecondChanceDto,
  ): ReturnType<AuctionCheckoutService['respondSecondChance']> {
    return this.checkoutService.respondSecondChance(id, userId, dto.accept);
  }

  /** Declines a second-chance invitation without reputation penalty. */
  @Post(':id/decline')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Người mua thứ hai từ chối lời mời mua món hàng đấu giá (không bị trừ uy tín)',
  })
  decline(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ): ReturnType<AuctionCheckoutService['respondSecondChance']> {
    return this.checkoutService.respondSecondChance(id, userId, false);
  }
}
