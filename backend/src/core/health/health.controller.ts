import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthCheckSchema, type HealthCheck } from '@nexus/contracts';
import type { Response } from 'express';
import { Public } from '../security/roles.decorator';
import { HealthService } from './health.service';

@ApiTags('0. HEALTH')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Kiểm tra sức khỏe hệ thống',
    description:
      'Trả về trạng thái thật của PostgreSQL, Redis, số kết nối Socket.IO đang mở, số sự kiện outbox chưa xử lý và thời gian uptime.',
  })
  @ApiOkResponse({ standardSchema: HealthCheckSchema })
  @ApiServiceUnavailableResponse({
    description: 'Một hoặc nhiều dịch vụ phụ thuộc (PostgreSQL/Redis) đang ngưng hoạt động.',
  })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthCheck> {
    const result = await this.health.check();
    res.status(result.status === 'down' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK);
    return result;
  }
}
