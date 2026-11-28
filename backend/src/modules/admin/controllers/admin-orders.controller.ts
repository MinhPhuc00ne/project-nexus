import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
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
  @ApiOperation({
    summary: 'List marketplace orders with filters and pagination (Admin & Support Staff)',
  })
  list(
    @ZodQuery(QueryAdminOrdersSchema) query: QueryAdminOrdersInput,
  ): ReturnType<AdminOrdersService['list']> {
    return this.orders.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get order details including payment, shipping, after-sales, and action history (Admin & Support Staff)',
  })
  detail(@ZodParam('id', UuidParamSchema) id: string): ReturnType<AdminOrdersService['detail']> {
    return this.orders.detail(id);
  }
}
