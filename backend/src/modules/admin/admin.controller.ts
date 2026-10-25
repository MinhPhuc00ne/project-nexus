import {
  Body,
  Controller,
  Delete,
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
import { Role, WithdrawalStatus } from '@prisma/client';
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
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { QueryAdminProductsDto } from './dto/query-admin-products.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { QueryAdminShopsDto } from './dto/query-admin-shops.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';
import { WarnShopDto } from './dto/warn-shop.dto';
import { CreateShopViolationDto } from './dto/create-shop-violation.dto';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { AdminUsersService } from './services/admin-users.service';
import { AdminProductsService } from './services/admin-products.service';
import { AdminShopsService } from './services/admin-shops.service';
import { AdminSettingsService } from './services/admin-settings.service';
import { CategoryService } from '../catalog/services/category.service';
import { CreateCategoryDto } from '../catalog/dtos/create-category.dto';
import { UpdateCategoryDto } from '../catalog/dtos/update-category.dto';

@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminUsersService: AdminUsersService,
    private readonly adminProductsService: AdminProductsService,
    private readonly adminShopsService: AdminShopsService,
    private readonly adminSettingsService: AdminSettingsService,
    private readonly categoryService: CategoryService,
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

  // ================= 12. CẬP NHẬT VAI TRÒ (ROLE) CHO TÀI KHOẢN =================
  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin cấp/thay đổi vai trò (Role) cho người dùng',
    description:
      'Admin có thể cấp mọi vai trò (BUYER, SELLER, SUPPORT_STAFF, ADMIN) cho bất kỳ tài khoản email nào trong hệ thống.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc hạ quyền chính mình' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async updateUserRole(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateUserRole(id, admin.id, dto);
  }

  // ================= 13. DANH SÁCH SẢN PHẨM TOÀN SÀN =================
  @Get('products')
  @ApiOperation({
    summary: 'Admin xem danh sách toàn bộ sản phẩm trên hệ thống',
    description:
      'Hỗ trợ tìm kiếm, lọc theo trạng thái (ACTIVE, INACTIVE, DRAFT), theo Seller hoặc theo Danh mục kèm phân trang.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách sản phẩm thành công' })
  async listProducts(@Query() query: QueryAdminProductsDto) {
    return this.adminProductsService.listProducts(query);
  }

  // ================= 14. CHI TIẾT SẢN PHẨM =================
  @Get('products/:id')
  @ApiOperation({
    summary: 'Admin xem chi tiết một sản phẩm kèm thông tin tồn kho và shop',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết sản phẩm thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async getProductById(@Param('id') id: string) {
    return this.adminProductsService.getProductById(id);
  }

  // ================= 15. DUYỆT HOẶC ẨN/KHÓA SẢN PHẨM =================
  @Patch('products/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin duyệt hoặc ẩn/khóa sản phẩm vi phạm',
    description:
      'Chuyển trạng thái sản phẩm sang ACTIVE (cho phép bán) hoặc INACTIVE (ẩn sản phẩm vi phạm, gửi thông báo lý do đến Seller).',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái sản phẩm thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async updateProductStatus(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.adminProductsService.updateProductStatus(id, admin.id, dto);
  }

  // ================= 16. XÓA SẢN PHẨM =================
  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin xóa sản phẩm',
    description:
      'Xóa an toàn sản phẩm nếu chưa phát sinh đơn hàng, hoặc tự động ẩn nếu đã có lịch sử đơn hàng.',
  })
  @ApiResponse({ status: 200, description: 'Xóa hoặc ẩn sản phẩm thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async deleteProduct(@Param('id') id: string, @CurrentUser() admin: CurrentUserPayload) {
    return this.adminProductsService.deleteProduct(id, admin.id);
  }

  // ================= 17. DANH SÁCH GIAN HÀNG (SHOPS) =================
  @Get('shops')
  @ApiOperation({
    summary: 'Admin xem danh sách toàn bộ gian hàng (Shop/Seller)',
    description:
      'Hỗ trợ lọc gian hàng theo trạng thái ACTIVE (đang mở) hoặc SUSPENDED (đang bị đình chỉ), lọc theo Tỉnh/Thành và tìm kiếm.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách gian hàng thành công' })
  async listShops(@Query() query: QueryAdminShopsDto) {
    return this.adminShopsService.listShops(query);
  }

  // ================= 18. ĐÌNH CHỈ HOẶC MỞ LẠI GIAN HÀNG =================
  @Patch('shops/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin đình chỉ hoặc mở lại gian hàng (Shop Suspension)',
    description:
      'Tạm ngưng hoạt động bán hàng của một shop (ẩn toàn bộ sản phẩm của shop) mà không khóa tài khoản cá nhân (vẫn được mua hàng làm Buyer). Tự động ghi vết lịch sử quản trị.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái gian hàng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gian hàng' })
  async updateShopStatus(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: UpdateShopStatusDto,
  ) {
    return this.adminShopsService.updateShopStatus(id, admin.id, dto);
  }

  // ================= 18b. XEM THÔNG TIN CHI TIẾT 1 GIAN HÀNG =================
  @Get('shops/:id')
  @ApiOperation({
    summary:
      'Admin xem chi tiết toàn diện 1 gian hàng (Thông tin, Sản phẩm, Vi phạm, Lịch sử quản trị)',
    description:
      'Trả về đầy đủ thông tin gian hàng: Tên, chủ shop, liên hệ, ngày mở, trạng thái; Thống kê sản phẩm (đang bán, hết hàng, bị ẩn/chờ duyệt); Hồ sơ vi phạm (báo cáo chờ duyệt, xác nhận, mức xử lý, bằng chứng); Lịch sử quản trị (ai cảnh cáo/đình chỉ/khôi phục, lúc nào, lý do gì).',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin chi tiết gian hàng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gian hàng' })
  async getShopDetail(@Param('id') id: string) {
    return this.adminShopsService.getShopDetail(id);
  }

  // ================= 18c. CẢNH CÁO GIAN HÀNG =================
  @Post('shops/:id/warn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin gửi văn bản cảnh cáo gian hàng (Shop Warning)',
    description:
      'Gửi cảnh cáo đến shop vi phạm, ghi vết vào lịch sử quản trị, gửi thông báo hệ thống và tùy chọn trừ điểm uy tín.',
  })
  @ApiResponse({ status: 200, description: 'Gửi cảnh cáo thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gian hàng' })
  async warnShop(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: WarnShopDto,
  ) {
    return this.adminShopsService.warnShop(id, admin.id, dto);
  }

  // ================= 18d. LẬP BIÊN BẢN VI PHẠM CHO GIAN HÀNG =================
  @Post('shops/:id/violations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin lập biên bản vi phạm cho gian hàng (Shop Violation)',
    description:
      'Ghi nhận hành vi vi phạm, bằng chứng (URL tài liệu/hình ảnh), mức xử lý (WARNING, PENALTY_POINTS, TEMPORARY_SUSPENSION, PERMANENT_BAN) và ghi chú giải quyết.',
  })
  @ApiResponse({ status: 201, description: 'Lập hồ sơ vi phạm thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gian hàng' })
  async createShopViolation(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: CreateShopViolationDto,
  ) {
    return this.adminShopsService.createShopViolation(id, admin.id, dto);
  }

  // ================= 18e. DANH SÁCH VI PHẠM CỦA GIAN HÀNG =================
  @Get('shops/:id/violations')
  @ApiOperation({
    summary: 'Admin xem danh sách các vi phạm của một gian hàng',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách vi phạm thành công' })
  async getShopViolations(@Param('id') id: string) {
    return this.adminShopsService.getShopViolations(id);
  }

  // ================= 18f. LỊCH SỬ THAO TÁC QUẢN TRỊ TRÊN GIAN HÀNG =================
  @Get('shops/:id/action-logs')
  @ApiOperation({
    summary:
      'Admin xem lịch sử thao tác quản trị trên gian hàng (Ai cảnh cáo/đình chỉ/khôi phục, lúc nào, lý do gì)',
  })
  @ApiResponse({ status: 200, description: 'Lấy lịch sử thao tác thành công' })
  async getShopActionLogs(@Param('id') id: string) {
    return this.adminShopsService.getShopActionLogs(id);
  }

  // ================= 18g. DANH SÁCH YÊU CẦU RÚT TIỀN CỦA SELLER =================
  @Get('withdrawals')
  @ApiOperation({
    summary: 'Admin xem danh sách các yêu cầu rút tiền của Người bán (Sellers)',
    description:
      'Hỗ trợ lọc theo trạng thái (PENDING, APPROVED, REJECTED, COMPLETED) kèm phân trang.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách yêu cầu rút tiền thành công' })
  async listWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listWithdrawalRequests(status, page, limit);
  }

  // ================= 18h. XÉT DUYỆT YÊU CẦU RÚT TIỀN =================
  @Patch('withdrawals/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin phê duyệt hoặc từ chối yêu cầu rút tiền của Người bán',
    description:
      'Nếu REJECTED: Hoàn trả số dư bị khóa về ví của Seller. Nếu APPROVED / COMPLETED: Khấu trừ tiền ví thành công.',
  })
  @ApiResponse({ status: 200, description: 'Xét duyệt yêu cầu rút tiền thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc đã xử lý trước đó' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu rút tiền' })
  async reviewWithdrawal(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    return this.adminService.reviewWithdrawalRequest(id, admin.id, dto);
  }

  // ================= 19. XEM CẤU HÌNH HỆ THỐNG SÀN =================
  @Get('settings')
  @ApiOperation({
    summary: 'Admin xem các thông số cấu hình vận hành hệ thống sàn',
    description:
      'Lấy các thông số như tỷ lệ phí sàn, thời gian giỏ hàng, thời gian giữ tồn kho khi checkout, giới hạn ảnh, giới hạn cấp danh mục.',
  })
  @ApiResponse({ status: 200, description: 'Lấy cấu hình thành công' })
  async getSettings() {
    return this.adminSettingsService.getSettings();
  }

  // ================= 20. CẬP NHẬT CẤU HÌNH HỆ THỐNG SÀN =================
  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin cập nhật các thông số vận hành sàn runtime',
    description:
      'Chỉnh sửa tỷ lệ phí sàn (%), thời hạn giỏ hàng (ngày), timeout checkout (phút)... mà không cần deploy lại code.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật cấu hình thành công' })
  async updateSettings(
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: UpdateSystemSettingsDto,
  ) {
    return this.adminSettingsService.updateSettings(admin.id, dto);
  }

  // ================= 21. TẠO DANH MỤC HÀNG HÓA =================
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin tạo mới danh mục sản phẩm (tối đa 3 cấp)',
    description: 'Tạo danh mục gốc (level 1) hoặc danh mục con cấp 2, 3 bằng cách truyền parentId.',
  })
  @ApiResponse({ status: 201, description: 'Tạo danh mục thành công' })
  @ApiResponse({ status: 400, description: 'Vượt quá 3 cấp danh mục hoặc dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Tên danh mục đã tồn tại' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
  }

  // ================= 22. CẬP NHẬT DANH MỤC HÀNG HÓA =================
  @Patch('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin cập nhật danh mục hoặc điều chuyển danh mục cha (re-parenting)',
    description: 'Chỉnh sửa tên, slug hoặc dời danh mục sang danh mục cha mới (parentId).',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật danh mục thành công' })
  @ApiResponse({ status: 400, description: 'Không thể chuyển vì gây vòng lặp hoặc vượt quá 3 cấp' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, dto);
  }

  // ================= 23. XÓA DANH MỤC HÀNG HÓA =================
  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin xóa danh mục sản phẩm',
    description: 'Chỉ xóa được danh mục khi không có danh mục con và không có sản phẩm liên kết.',
  })
  @ApiResponse({ status: 200, description: 'Xóa danh mục thành công' })
  @ApiResponse({ status: 400, description: 'Danh mục đang có danh mục con hoặc có sản phẩm' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
