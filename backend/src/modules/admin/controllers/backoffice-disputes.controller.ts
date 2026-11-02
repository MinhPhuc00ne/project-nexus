import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Roles } from '../../../core/security/roles.decorator';
import { QueryAdminDisputesDto } from '../dtos/query-admin-disputes.dto';
import { AdminDisputesService } from '../services/admin-disputes.service';

@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPPORT_STAFF)
@Controller('backoffice')
export class BackofficeDisputesController {
  constructor(private readonly adminDisputesService: AdminDisputesService) {}

  @Get('disputes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[STAFF / ADMIN] Tra cứu danh sách khiếu nại toàn sàn (Backoffice API)',
    description:
      'API theo quy chuẩn SRS Backoffice để Staff/Admin truy xuất toàn bộ khiếu nại đang chờ xử lý và lịch sử xử lý tranh chấp trên nền tảng.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách khiếu nại thành công' })
  async getDisputes(@Query() query: QueryAdminDisputesDto) {
    return this.adminDisputesService.getDisputes(query);
  }
}
