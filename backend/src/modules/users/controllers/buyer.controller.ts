import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService, UserProfileResponse } from '../services/users.service';
import { AddressService } from '../services/address.service';
import {
  UpdateBuyerProfileDto,
  ApplySellerUpgradeDto,
  CreateAddressDto,
  UpdateAddressDto,
} from '../../users/dtos/users.dto';
import { CurrentUser, RequirePrivilege, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/types';

@ApiTags('2. BUYER')
@Controller('buyer')
export class BuyerController {
  constructor(
    private readonly usersService: UsersService,
    private readonly addressService: AddressService,
  ) {}

  @ApiOperation({
    summary: '[BUYER] PROFILE.VIEW - Xem thông tin cá nhân và số dư ví',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePrivilege('PROFILE.VIEW')
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string): Promise<UserProfileResponse> {
    return this.usersService.getProfile(userId);
  }

  @ApiOperation({
    summary: '[BUYER / SELLER] PROFILE.UPDATE - Cập nhật thông tin hồ sơ cá nhân',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @RequirePrivilege('PROFILE.UPDATE')
  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Body() dto: UpdateBuyerProfileDto,
    @Headers('x-verification-token') verificationHeader?: string,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateProfile(userId, dto, userRole, verificationHeader);
  }

  @ApiOperation({
    summary: '[BUYER] Tải lên ảnh hoặc file chứng minh để nộp hồ sơ xin lên Seller',
    description: 'Hỗ trợ định dạng file ảnh hoặc PDF chứng minh hoạt động kinh doanh/căn cước.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER)
  @ApiConsumes('multipart/form-data')
  @Post('seller-upgrade/upload-proof')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProof(
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
  ): Promise<{ url: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required for upload');
    }
    return this.usersService.uploadProofDocument(file.buffer, file.originalname);
  }

  @ApiOperation({
    summary:
      '[BUYER] Nộp đơn xin nâng cấp thành tài khoản Seller (Gộp thông tin gian hàng & file chứng minh)',
    description:
      'Gửi thông tin gian hàng, địa chỉ, tọa độ GPS và đính kèm trực tiếp file/ảnh chứng minh (CCCD/GPKD) trong 1 lần request duy nhất.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['storeName', 'phone', 'street', 'city'],
      properties: {
        storeName: {
          type: 'string',
          example: 'Gốm Sứ Bát Tràng Store',
          description: 'Tên gian hàng',
        },
        storeDescription: {
          type: 'string',
          example: 'Chuyên cung cấp đồ gốm sứ nghệ thuật cao cấp',
        },
        phone: { type: 'string', example: '0988776655', description: 'Số điện thoại gian hàng' },
        businessEmail: { type: 'string', example: 'shop@battrangceramics.vn' },
        identityCardNumber: {
          type: 'string',
          example: '001202008888',
          description: 'Số CCCD/CMND',
        },
        street: {
          type: 'string',
          example: '720A Điện Biên Phủ',
          description: 'Địa chỉ đường/số nhà',
        },
        ward: { type: 'string', example: 'Phường 22' },
        district: { type: 'string', example: 'Quận Bình Thạnh' },
        city: { type: 'string', example: 'TP. Hồ Chí Minh' },
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
          description: 'Ảnh CCCD/CMND hoặc file Giấy phép kinh doanh (JPG, PNG, WEBP, PDF)',
        },
        attachmentUrl: {
          type: 'string',
          example: 'https://res.cloudinary.com/...',
          description:
            'Hoặc link file chứng minh đã tải lên trước (nếu không đính kèm file trực tiếp)',
        },
      },
    },
  })
  @Post('seller-upgrade/apply')
  async applySellerUpgrade(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplySellerUpgradeDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ success: boolean; message: string; requestId: string }> {
    return this.usersService.applySellerUpgrade(userId, dto, file);
  }

  // --- QUẢN LÝ SỔ ĐỊA CHỈ GIAO HÀNG (USER ADDRESSES) & BẢN ĐỒ TOÀN CẦU ---

  @ApiOperation({
    summary: '[BUYER] Tìm kiếm gợi ý địa chỉ toàn cầu (Geocoding Autocomplete)',
    description:
      'Tìm kiếm gợi ý địa chỉ và tọa độ GPS qua bản đồ toàn cầu (OpenStreetMap Nominatim).',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('addresses/search')
  async searchAddress(@Query('q') query: string) {
    return this.addressService.searchAddress(query);
  }

  @ApiOperation({
    summary: '[BUYER] Dịch ngược tọa độ ghim bản đồ thành địa chỉ chi tiết (Reverse Geocoding)',
    description:
      'Truyền tọa độ GPS (lat, lng) khi kéo ghim trên bản đồ để tự động bóc tách số nhà, phường xã, quận huyện, tỉnh thành.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('addresses/reverse')
  async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.addressService.reverseGeocode(parseFloat(lat), parseFloat(lng));
  }

  @ApiOperation({
    summary: '[BUYER] Xem danh sách sổ địa chỉ nhận hàng của Buyer',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('addresses')
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.addressService.getAddresses(userId);
  }

  @ApiOperation({
    summary: '[BUYER] Thêm địa chỉ nhận hàng mới kèm tọa độ bản đồ',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('addresses')
  async createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.addressService.createAddress(userId, dto);
  }

  @ApiOperation({
    summary: '[BUYER] Cập nhật thông tin địa chỉ và tọa độ bản đồ',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('addresses/:id')
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(userId, addressId, dto);
  }

  @ApiOperation({
    summary: '[BUYER] Đặt làm địa chỉ nhận hàng mặc định',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('addresses/:id/default')
  async setDefaultAddress(@CurrentUser('id') userId: string, @Param('id') addressId: string) {
    return this.addressService.setDefaultAddress(userId, addressId);
  }

  @ApiOperation({
    summary: '[BUYER] Xóa một địa chỉ nhận hàng',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('addresses/:id')
  async deleteAddress(@CurrentUser('id') userId: string, @Param('id') addressId: string) {
    return this.addressService.deleteAddress(userId, addressId);
  }
}
