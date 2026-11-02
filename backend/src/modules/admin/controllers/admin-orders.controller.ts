import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { Roles } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import { QueryAdminOrdersDto } from '../dtos/query-admin-orders.dto';
import { AdminOrdersService } from '../services/admin-orders.service';

@ApiTags('5. ADMIN - ORDERS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Admin tra cứu đơn toàn sàn, lọc và phân trang' })
  list(@Query() query: QueryAdminOrdersDto): ReturnType<AdminOrdersService['list']> {
    return this.orders.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn, thanh toán, vận chuyển và xử lý hậu mãi' })
  detail(@Param('id') id: string): ReturnType<AdminOrdersService['detail']> {
    return this.orders.detail(id);
  }
}
