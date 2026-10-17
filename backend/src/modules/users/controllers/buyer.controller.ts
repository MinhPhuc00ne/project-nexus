import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService, AuthTokensResult } from '../../auth/services/auth.service';
import { UsersService, UserProfileResponse } from '../services/users.service';
import { RegisterBuyerDto } from '../../auth/dtos/auth.dto';
import { UpdateProfileDto, ApplySellerUpgradeDto } from '../../users/dtos/users.dto';
import { Public, CurrentUser, RequirePrivilege } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';

@ApiTags('2. BUYER')
@Controller('buyer')
export class BuyerController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiExcludeEndpoint()
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerBuyer(@Body() dto: RegisterBuyerDto): Promise<AuthTokensResult> {
    return this.authService.registerBuyer(dto);
  }

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
    summary: '[BUYER] PROFILE.UPDATE - Cập nhật thông tin hồ sơ cá nhân',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePrivilege('PROFILE.UPDATE')
  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateProfile(userId, dto);
  }

  @ApiOperation({
    summary: '[BUYER] Tải lên ảnh hoặc file chứng minh để nộp hồ sơ xin lên Seller',
    description: 'Hỗ trợ định dạng file ảnh hoặc PDF chứng minh hoạt động kinh doanh/căn cước.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
    summary: '[BUYER] Nộp đơn xin nâng cấp thành tài khoản Seller',
    description:
      'Buyer nộp thông tin cửa hàng kèm URL ảnh/file chứng minh đã tải lên để chờ Admin duyệt.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('seller-upgrade/apply')
  async applySellerUpgrade(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplySellerUpgradeDto,
  ): Promise<{ success: boolean; message: string; requestId: string }> {
    return this.usersService.applySellerUpgrade(userId, dto);
  }
}
