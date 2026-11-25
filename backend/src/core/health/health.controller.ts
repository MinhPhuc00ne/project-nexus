import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheckSchema, type HealthCheck } from '@nexus/contracts';
import { Public } from '../security/roles.decorator';
import { HealthService } from './health.service';

@ApiTags('0. HEALTH')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kiểm tra sức khỏe hệ thống',
    description:
      'Trả về trạng thái thật của PostgreSQL, Redis, số kết nối Socket.IO đang mở, số sự kiện outbox chưa xử lý và thời gian uptime.',
  })
  @ApiOkResponse({ standardSchema: HealthCheckSchema })
  check(): Promise<HealthCheck> {
    return this.health.check();
  }
}
