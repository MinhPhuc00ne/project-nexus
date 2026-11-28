import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodQuery } from '@nexus/contracts/nest';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Roles } from '../../../core/security/roles.decorator';
import {
  QueryAdminDisputesInput,
  QueryAdminDisputesSchema,
} from '../dtos/query-admin-disputes.dto';
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
    summary: '[STAFF / ADMIN] List marketplace disputes (Backoffice API)',
    description:
      'Backoffice endpoint for Staff and Admin to query pending disputes and dispute resolution history across the platform.',
  })
  @ApiResponse({ status: 200, description: 'Disputes retrieved successfully' })
  async getDisputes(@ZodQuery(QueryAdminDisputesSchema) query: QueryAdminDisputesInput) {
    return this.adminDisputesService.getDisputes(query);
  }
}
