import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ZodBody, ZodQuery } from '@nexus/contracts/nest';
import {
  AuthenticatedUserPayload,
  CurrentUser,
  Roles,
} from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/types';
import {
  CreateSellerRequestInput,
  CreateSellerRequestSchema,
} from '../dtos/create-seller-request.dto';
import { ToggleSellerInput, ToggleSellerSchema } from '../dtos/toggle-seller.dto';
import {
  QueryReputationLogsInput,
  QueryReputationLogsSchema,
  ReputationSummaryResponse,
} from '../dtos/reputation.dto';
import { UsersService } from '../services/users.service';
import { ReputationService } from '../services/reputation.service';
import { sellerProofFileFilter, sellerProofStorage } from '../utils/seller-proof-upload.util';

@ApiTags('2. BUYER')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly reputationService: ReputationService,
  ) {}

  // ================= 1. XEM THÔNG TIN CÁ NHÂN =================
  @Get('me')
  @ApiOperation({
    summary: 'Lấy thông tin tài khoản hiện tại, số dư ví và trạng thái Seller',
    description:
      'Trả về thông tin chi tiết bao gồm vai trò (role), trạng thái người bán (isSellerActive) và số dư ví.',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token không hợp lệ' })
  async getMe(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.usersService.getMe(user.id);
  }

  // ================= 2. CHUYỂN ĐỔI CHẾ ĐỘ BUYER <-> SELLER =================
  @Patch('toggle-seller')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chuyển đổi linh hoạt giữa giao diện Người mua và Người bán',
    description:
      'Chỉ những tài khoản đã được Admin nâng cấp thành công lên SELLER mới có quyền thực hiện thao tác này. Nếu tài khoản chưa phải Seller, hệ thống sẽ trả về lỗi 403 Forbidden.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chuyển đổi trạng thái tài khoản thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Tài khoản chưa được cấp quyền Seller, không thể chuyển đổi',
  })
  async toggleSeller(
    @CurrentUser() user: AuthenticatedUserPayload,
    @ZodBody(ToggleSellerSchema) dto: ToggleSellerInput,
  ) {
    return this.usersService.toggleSellerMode(user.id, dto);
  }

  // ================= 3. BUYER GỬI YÊU CẦU VÀ FILE ĐÍNH KÈM CHỨNG MINH =================
  @Post('seller-request')
  @UseGuards(RolesGuard)
  @Roles(Role.BUYER)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: sellerProofStorage,
      fileFilter: sellerProofFileFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary:
      'Người mua (Buyer) gửi yêu cầu và file/tài liệu đính kèm chứng minh để nâng cấp lên Seller',
    description:
      'Gửi thông tin gian hàng và bắt buộc đính kèm file chứng minh (ảnh chụp CCCD/CMND, Giấy phép kinh doanh, hợp đồng thương nhân, v.v.). Có thể chọn upload file trực tiếp hoặc truyền attachmentUrl.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['storeName', 'phone'],
      properties: {
        storeName: {
          type: 'string',
          example: 'Cổ Vật Hoàng Gia Store',
          description: 'Tên gian hàng / thương hiệu của người bán',
        },
        storeDescription: {
          type: 'string',
          example: 'Chuyên cung cấp đồ cổ sưu tầm, kỷ vật lịch sử và các tác phẩm độc bản.',
          description: 'Mô tả gian hàng và sản phẩm kinh doanh',
        },
        phone: {
          type: 'string',
          example: '0987654321',
          description: 'Số điện thoại liên hệ của cửa hàng',
        },
        businessEmail: {
          type: 'string',
          example: 'shop@hoanggiavintage.com',
          description: 'Email liên hệ kinh doanh',
        },
        identityCardNumber: {
          type: 'string',
          example: '001202008888',
          description: 'Số CMND/CCCD hoặc Mã số định danh doanh nghiệp',
        },
        street: {
          type: 'string',
          example: '720A Điện Biên Phủ',
          description: 'Địa chỉ cụ thể / số nhà, tên đường của cửa hàng',
        },
        ward: { type: 'string', example: 'Phường 22', description: 'Phường/xã' },
        district: { type: 'string', example: 'Quận Bình Thạnh', description: 'Quận/huyện' },
        city: { type: 'string', example: 'TP. Hồ Chí Minh', description: 'Tỉnh/thành phố' },
        latitude: { type: 'number', example: 10.795, description: 'Vĩ độ GPS bản đồ' },
        longitude: { type: 'number', example: 106.721, description: 'Kinh độ GPS bản đồ' },
        formattedAddress: {
          type: 'string',
          example: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh',
        },
        placeId: { type: 'string', example: 'ChIJ_landmark81_hcm' },
        file: {
          type: 'string',
          format: 'binary',
          description:
            'File hoặc tài liệu đính kèm chứng minh (JPG, PNG, WEBP, PDF, DOC tối đa 15MB)',
        },
        attachmentUrl: {
          type: 'string',
          example: 'https://res.cloudinary.com/...',
          description:
            'Hoặc đường dẫn file chứng minh đã tải lên trước (nếu không upload qua form-data)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Gửi yêu cầu nâng cấp và tài liệu chứng minh thành công, đang chờ Admin duyệt',
  })
  @ApiResponse({
    status: 400,
    description:
      'Chưa đính kèm tài liệu chứng minh, hoặc đã có yêu cầu PENDING, hoặc tài khoản đã là Seller',
  })
  /**
   * Submit seller upgrade request.
   *
   * @param user Authenticated user payload.
   * @param dto Seller upgrade request details.
   * @param file Optional verification document.
   * @returns Created seller request.
   */
  async createSellerRequest(
    @CurrentUser() user: AuthenticatedUserPayload,
    @ZodBody(CreateSellerRequestSchema) dto: CreateSellerRequestInput,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.createSellerRequest(user.id, dto, file);
  }

  /**
   * Retrieve current user's seller upgrade requests.
   *
   * @param user Authenticated user payload.
   * @returns List of seller requests.
   */
  @Get('seller-request/me')
  @UseGuards(RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({
    summary: 'Xem lịch sử và trạng thái các yêu cầu nâng cấp Seller của tài khoản hiện tại',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách yêu cầu thành công' })
  async getMySellerRequests(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.usersService.getMySellerRequests(user.id);
  }

  // ================= 4. REPUTATION SUMMARY & AUDIT LOGS =================
  @Get('reputation/summary')
  @ApiOperation({
    summary: 'Retrieve user reputation summary, trust tier, and operational badges',
    description:
      'Returns reputation points, documented trust thresholds, excellent reputation badge, and selling permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reputation summary metrics retrieved successfully',
    type: ReputationSummaryResponse,
  })
  async getReputationSummary(
    @CurrentUser('id') userId: string,
  ): Promise<ReputationSummaryResponse> {
    return this.reputationService.getReputationSummary(userId);
  }

  @Get('reputation/logs')
  @ApiOperation({
    summary: 'Retrieve chronological reputation audit logs for current user',
    description:
      'Provides paginated history of point deductions, milestone awards, and audit trail records associated with transactions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reputation audit log history retrieved successfully',
  })
  async getReputationLogs(
    @CurrentUser('id') userId: string,
    @ZodQuery(QueryReputationLogsSchema) query: QueryReputationLogsInput,
  ) {
    return this.reputationService.getReputationLogs(userId, query.page, query.limit);
  }
}
