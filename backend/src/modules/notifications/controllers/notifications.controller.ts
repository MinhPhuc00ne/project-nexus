import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { QueryNotificationDto } from '../dtos/query-notification.dto';
import { UpdateNotificationPreferencesDto } from '../dtos/update-notification-preferences.dto';
import { NotificationsService } from '../services/notifications.service';
import {
  AdminNotificationSummaryDto,
  NotificationPageDto,
} from '../dtos/notification-response.dto';

@ApiTags('9. NOTIFICATIONS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List paginated notifications for the authenticated account',
    description:
      'Retrieves paginated in-app notifications sorted newest first, supporting filters by read status (isRead) and category (type). For instant 0-second delivery across Admin, Staff, Seller, and Buyer, connect Socket.IO to namespace /ws/notifications with handshake auth { token: "<JWT>" } and listen to "notification:new" and "notification:unread_count".',
  })
  @ApiResponse({
    status: 200,
    type: NotificationPageDto,
    description:
      'Notifications retrieved successfully. Actionable Admin notifications include targetUrl routes such as /admin/sellers, /admin/auctions, /admin/finance, /admin/reports, /admin/refunds, /admin/products, /admin/stores, and /admin/banners.',
  })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: QueryNotificationDto,
  ): Promise<NotificationPageDto> {
    return this.notificationsService.getUserNotifications(userId, query);
  }

  @Get('admin/summary')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Get notification summary and pending moderation queue counters',
    description:
      'Aggregates unread notification count, latest 10 Admin notifications, and live pending item counts across seller upgrades, auction consignments, withdrawals, order disputes, violation reports, pending refunds, and GHN pickup verifications.',
  })
  @ApiResponse({
    status: 200,
    type: AdminNotificationSummaryDto,
    description: 'Admin notification summary and pending queue counts retrieved successfully.',
  })
  @ApiResponse({ status: 403, description: 'Administrative role required.' })
  async getAdminSummary(@CurrentUser('id') adminId: string): Promise<AdminNotificationSummaryDto> {
    return this.notificationsService.getAdminNotificationSummary(adminId);
  }

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user notification channel preferences (In-App, Email, Push)',
    description: 'Returns enabled/disabled flags for each notification delivery channel.',
  })
  @ApiResponse({ status: 200, description: 'Notification preferences retrieved successfully.' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user notification channel preferences (In-App, Email, Push)',
    description: 'Persists opt-in or opt-out preferences for Email, Web Push, and In-App channels.',
  })
  @ApiResponse({ status: 200, description: 'Notification preferences updated successfully.' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get unread notification count for header badge indicator',
    description: 'Returns the number of unread notifications for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Unread notification count retrieved successfully.' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a specific notification as read',
  })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully.' })
  @ApiResponse({ status: 404, description: 'Notification not found for current user.' })
  async markAsRead(@CurrentUser('id') userId: string, @Param('id') notificationId: string) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all unread notifications for the current account as read',
  })
  @ApiResponse({ status: 200, description: 'All unread notifications marked as read.' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
