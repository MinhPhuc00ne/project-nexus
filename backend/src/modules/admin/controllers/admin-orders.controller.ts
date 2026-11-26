import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodQuery } from '@nexus/contracts/nest';
import { Role } from '@nexus/types';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { Roles } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import { QueryAdminOrdersInput, QueryAdminOrdersSchema } from '../dtos/query-admin-orders.dto';
import { AdminOrdersService } from '../services/admin-orders.service';

@ApiTags('5. ADMIN - ORDERS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPPORT_STAFF)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Admin & Nhân viên hỗ trợ tra cứu đơn toàn sàn, lọc và phân trang' })
  list(
    @ZodQuery(QueryAdminOrdersSchema) query: QueryAdminOrdersInput,
  ): ReturnType<AdminOrdersService['list']> {
    return this.orders.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Admin & Nhân viên hỗ trợ xem chi tiết đơn, thanh toán, vận chuyển, hậu mãi và lịch sử thao tác',
  })
  detail(@Param('id') id: string): ReturnType<AdminOrdersService['detail']> {
    return this.orders.detail(id);
  }
}
