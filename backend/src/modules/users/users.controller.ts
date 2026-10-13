import {
  Body,
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
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSellerRequestDto } from './dto/create-seller-request.dto';
import { ToggleSellerDto } from './dto/toggle-seller.dto';
import { UsersService } from './users.service';
import { sellerProofFileFilter, sellerProofStorage } from './utils/seller-proof-upload.util';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ================= 1. XEM THÔNG TIN CÁ NHÂN =================
  @Get('me')
  @ApiOperation({
    summary: 'Lấy thông tin tài khoản hiện tại, số dư ví và trạng thái Seller',
    description:
      'Trả về thông tin chi tiết bao gồm vai trò (role), trạng thái người bán (isSellerActive) và số dư ví.',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token không hợp lệ' })
  async getMe(@CurrentUser() user: CurrentUserPayload) {
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
  async toggleSeller(@CurrentUser() user: CurrentUserPayload, @Body() dto: ToggleSellerDto) {
    return this.usersService.toggleSellerMode(user.id, dto);
  }

  // ================= 3. BUYER GỬI YÊU CẦU VÀ FILE ĐÍNH KÈM CHỨNG MINH =================
  @Post('seller-request')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: sellerProofStorage,
      fileFilter: sellerProofFileFilter,
      limits: { fileSize: 15 * 1024 * 1024 }, // Tối đa 15MB
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
        file: {
          type: 'string',
          format: 'binary',
          description:
            'File hoặc tài liệu đính kèm chứng minh (JPG, PNG, WEBP, PDF, DOC tối đa 15MB)',
        },
        attachmentUrl: {
          type: 'string',
          example: '/uploads/seller-proofs/proof-sample.png',
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
  async createSellerRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSellerRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.createSellerRequest(user.id, dto, file);
  }

  // ================= 4. XEM TRẠNG THÁI YÊU CẦU NÂNG CẤP CỦA TÔI =================
  @Get('seller-request/me')
  @ApiOperation({
    summary: 'Xem lịch sử và trạng thái các yêu cầu nâng cấp Seller của tài khoản hiện tại',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách yêu cầu thành công' })
  async getMySellerRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMySellerRequests(user.id);
  }
}
