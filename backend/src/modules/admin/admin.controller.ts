import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QuerySellerRequestsDto } from './dto/query-seller-requests.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { RejectSellerRequestDto } from './dto/reject-seller-request.dto';

@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ================= 1. TẠO TÀI KHOẢN CHO STAFF =================
  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo tài khoản cho nhân viên hỗ trợ (Support Staff)',
    description:
      'Chỉ Admin có quyền tạo tài khoản nhân viên. Tài khoản được cấp quyền SUPPORT_STAFF và kích hoạt ngay lập tức.',
  })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản staff thành công' })
  @ApiResponse({ status: 400, description: 'Email đã tồn tại' })
  @ApiResponse({ status: 403, description: 'Không có quyền Admin' })
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.adminService.createStaff(dto);
  }

  // ================= 1b. GỬI LỜI MỜI CHO STAFF =================
  @Post('staff/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Gửi link lời mời kích hoạt tài khoản Staff qua email cá nhân',
  })
  @ApiResponse({ status: 201, description: 'Gửi lời mời thành công' })
  async inviteStaff(
    @Body() dto: { fullName: string; email: string; phoneNumber?: string; department?: string },
  ) {
    return this.adminService.inviteStaff(dto);
  }

  // ================= 2. DANH SÁCH TÀI KHOẢN STAFF =================
  @Get('staff')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả nhân viên hỗ trợ (Support Staff)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách staff thành công' })
  async listStaff(@Query() query: QueryStaffDto) {
    return this.adminService.listStaff(query);
  }

  // ================= 3. DANH SÁCH YÊU CẦU NÂNG CẤP LÊN SELLER =================
  @Get('seller-requests')
  @ApiOperation({
    summary: 'Xem danh sách yêu cầu nâng cấp lên Seller của người mua',
    description: 'Hỗ trợ lọc theo trạng thái PENDING, APPROVED, REJECTED và phân trang.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách yêu cầu thành công' })
  async getSellerRequests(@Query() query: QuerySellerRequestsDto) {
    return this.adminService.getSellerRequests(query);
  }

  // ================= 4. CHI TIẾT YÊU CẦU NÂNG CẤP =================
  @Get('seller-requests/:id')
  @ApiOperation({
    summary: 'Xem chi tiết một yêu cầu nâng cấp Seller',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết yêu cầu thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu' })
  async getSellerRequestById(@Param('id') id: string) {
    return this.adminService.getSellerRequestById(id);
  }

  // ================= 5. ADMIN DUYỆT YÊU CẦU NÂNG CẤP (APPROVE) =================
  @Patch('seller-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin phê duyệt yêu cầu nâng cấp lên Seller',
    description:
      'Chuyển trạng thái yêu cầu sang APPROVED, nâng cấp role tài khoản thành SELLER và kích hoạt chế độ bán hàng (isSellerActive = true).',
  })
  @ApiResponse({ status: 200, description: 'Phê duyệt thành công, tài khoản đã là Seller' })
  @ApiResponse({ status: 400, description: 'Yêu cầu không ở trạng thái PENDING' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu' })
  async approveSellerRequest(@Param('id') id: string, @CurrentUser() admin: CurrentUserPayload) {
    return this.adminService.approveSellerRequest(id, admin.id);
  }

  // ================= 6. ADMIN TỪ CHỐI YÊU CẦU NÂNG CẤP (REJECT) =================
  @Patch('seller-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin từ chối yêu cầu nâng cấp lên Seller',
    description:
      'Chuyển trạng thái yêu cầu sang REJECTED kèm lý do từ chối và thông báo đến người dùng.',
  })
  @ApiResponse({ status: 200, description: 'Đã từ chối yêu cầu' })
  @ApiResponse({ status: 400, description: 'Yêu cầu không ở trạng thái PENDING' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu' })
  async rejectSellerRequest(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: RejectSellerRequestDto,
  ) {
    return this.adminService.rejectSellerRequest(id, admin.id, dto);
  }
}
