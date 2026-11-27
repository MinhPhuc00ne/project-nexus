import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  QuerySellerDisputesInput,
  QuerySellerDisputesSchema,
  QuerySellerReviewsInput,
  QuerySellerReviewsSchema,
  RespondDisputeInput,
  RespondDisputeSchema,
} from '../dtos/seller-engagement.dto';
import { SellerEngagementService } from '../services/seller-engagement.service';

@ApiTags('8. COMMERCE - SELLER REVIEWS & DISPUTES')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER, Role.ADMIN)
@Controller('seller')
export class SellerEngagementController {
  constructor(private readonly sellerEngagementService: SellerEngagementService) {}

  @Get('reviews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Xem danh sách đánh giá của khách hàng và phân bố sao',
    description:
      'Lấy danh sách đánh giá nhận xét từ người mua về các đơn hàng của gian hàng, tính điểm trung bình và biểu đồ phân bổ từ 1 đến 5 sao.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách đánh giá thành công' })
  async getReviews(
    @CurrentUser('id') sellerId: string,
    @ZodQuery(QuerySellerReviewsSchema) query: QuerySellerReviewsInput,
  ) {
    return this.sellerEngagementService.getReviews(sellerId, query);
  }

  @Get('disputes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Xem danh sách các khiếu nại (Disputes) trên đơn hàng của gian hàng',
    description:
      'Lấy danh sách các khiếu nại do người mua mở kèm theo lý do, link bằng chứng, trạng thái xử lý và bộ đếm trạng thái.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách khiếu nại thành công' })
  async getDisputes(
    @CurrentUser('id') sellerId: string,
    @ZodQuery(QuerySellerDisputesSchema) query: QuerySellerDisputesInput,
  ) {
    return this.sellerEngagementService.getDisputes(sellerId, query);
  }

  @Post('disputes/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Gửi giải trình và bổ sung bằng chứng đối chất khiếu nại',
    description:
      'Người bán phản hồi lý do khiếu nại của người mua, đính kèm link hình ảnh/video đóng gói để Ban quản trị sàn đối soát và phân xử.',
  })
  @ApiResponse({ status: 200, description: 'Gửi giải trình khiếu nại thành công' })
  @ApiResponse({ status: 400, description: 'Khiếu nại đã kết thúc hoặc dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khiếu nại' })
  async respondToDispute(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) disputeId: string,
    @ZodBody(RespondDisputeSchema) dto: RespondDisputeInput,
  ) {
    return this.sellerEngagementService.respondToDispute(sellerId, disputeId, dto);
  }
}
