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
import { AdminInviteStaffDto } from './dto/invite-staff.dto';
import { LockUserDto, UpdateUserStatusDto } from './dto/lock-user.dto';
import { QuerySellerRequestsDto } from './dto/query-seller-requests.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { RejectSellerRequestDto } from './dto/reject-seller-request.dto';
import { AdminUsersService } from './services/admin-users.service';

@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  // ================= 1. TẠO / MỜI TÀI KHOẢN CHO STAFF =================
  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo tài khoản / Mời nhân viên hỗ trợ (Support Staff)',
    description:
      'Admin nhập Họ tên, email cá nhân, số điện thoại, phòng ban. Hệ thống sẽ sinh tài khoản công tác @staff.com, trả về ngay khi gửi và gửi email mời kích hoạt về email cá nhân của Staff.',
  })
  @ApiResponse({ status: 201, description: 'Gửi lời mời và cấp tài khoản @staff.com thành công' })
  @ApiResponse({ status: 400, description: 'Email đã tồn tại hoặc không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền Admin' })
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.adminService.createStaff(dto);
  }

  // ================= 1b. GỬI LỜI MỜI CHO STAFF =================
  @Post('staff/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Gửi link lời mời kích hoạt tài khoản Staff qua email cá nhân và cấp tài khoản @staff.com',
    description:
      'Admin nhập Họ và tên, email cá nhân, số điện thoại. Hệ thống sẽ sinh tài khoản công tác @staff.com, trả về ngay khi gửi và dispatch email mời kích hoạt về email cá nhân của Staff.',
  })
  @ApiResponse({
    status: 201,
    description: 'Gửi lời mời thành công, trả về tài khoản @staff.com được cấp',
  })
  async inviteStaff(@Body() dto: AdminInviteStaffDto) {
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

  // ================= 7. DANH SÁCH TOÀN BỘ NGƯỜI DÙNG =================
  @Get('users')
  @ApiOperation({
    summary: 'Lấy toàn bộ danh sách người dùng (kèm phân trang, lọc vai trò và tìm kiếm)',
    description:
      'Admin xem danh sách người dùng trong hệ thống (tự động loại trừ GUEST). Hỗ trợ lọc theo vai trò (BUYER, SELLER, SUPPORT_STAFF, ADMIN), trạng thái khóa (ACTIVE/LOCKED), và tìm kiếm theo tên, email, sđt.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách người dùng thành công' })
  async listUsers(@Query() query: QueryUsersDto) {
    return this.adminUsersService.listUsers(query);
  }

  // ================= 8. CHI TIẾT CÁ NHÂN NGƯỜI DÙNG =================
  @Get('users/:id')
  @ApiOperation({
    summary: 'Admin xem chi tiết cá nhân một người dùng',
    description:
      'Xem đầy đủ thông tin cá nhân, ví tiền, sổ địa chỉ và thống kê đơn hàng/sản phẩm của người dùng.',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin người dùng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async getUserById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  // ================= 9. KHÓA TÀI KHOẢN NGƯỜI DÙNG =================
  @Patch('users/:id/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin khóa tài khoản người dùng',
    description:
      'Chuyển trustLevel sang SUSPENDED và thu hồi toàn bộ Refresh Tokens của người dùng để đăng xuất ngay lập tức.',
  })
  @ApiResponse({ status: 200, description: 'Khóa tài khoản thành công' })
  @ApiResponse({ status: 400, description: 'Không thể khóa Admin hoặc tài khoản đã bị khóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản người dùng' })
  async lockUser(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: LockUserDto,
  ) {
    return this.adminUsersService.lockUser(id, admin.id, dto);
  }

  // ================= 10. MỞ KHÓA TÀI KHOẢN NGƯỜI DÙNG =================
  @Patch('users/:id/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin mở khóa tài khoản người dùng',
    description:
      'Khôi phục trustLevel của người dùng về STANDARD/EXCELLENT dựa trên reputationScore.',
  })
  @ApiResponse({ status: 200, description: 'Mở khóa tài khoản thành công' })
  @ApiResponse({ status: 400, description: 'Tài khoản không ở trạng thái bị khóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản người dùng' })
  async unlockUser(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: LockUserDto,
  ) {
    return this.adminUsersService.unlockUser(id, admin.id, dto);
  }

  // ================= 11. CẬP NHẬT TRẠNG THÁI KHÓA/MỞ KHÓA =================
  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin cập nhật trạng thái khóa/mở khóa tài khoản',
    description: 'Bật hoặc tắt trạng thái khóa tài khoản thông qua trường isLocked boolean.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  async updateUserStatus(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateUserStatus(id, admin.id, dto);
  }
}
