import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { QueryNotificationDto } from '../dtos/query-notification.dto';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('9. NOTIFICATIONS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách thông báo của tài khoản hiện tại',
    description:
      'Hỗ trợ phân trang và lọc theo trạng thái đã đọc (isRead = true/false), sắp xếp thông báo mới nhất lên đầu.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thông báo thành công' })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationsService.getUserNotifications(userId, query);
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy số lượng thông báo chưa đọc',
    description:
      'Trả về số lượng thông báo chưa đọc để hiển thị chấm đỏ trên biểu tượng quả chuông ở Header.',
  })
  @ApiResponse({ status: 200, description: 'Lấy số lượng thông báo chưa đọc thành công' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu một thông báo cụ thể là đã đọc',
  })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu thông báo là đã đọc' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async markAsRead(@CurrentUser('id') userId: string, @Param('id') notificationId: string) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu tất cả thông báo của tài khoản là đã đọc',
  })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu tất cả thông báo là đã đọc' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
