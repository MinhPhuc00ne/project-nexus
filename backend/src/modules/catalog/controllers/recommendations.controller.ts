import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { FeedbackPageDto } from '../../commerce/dtos/feedback.dto';
import { RecommendationsService } from '../services/recommendations.service';

@Controller('catalog/recommendations')
@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BUYER, Role.SELLER)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}
  @Get()
  get(@CurrentUser('id') id: string, @Query() query: FeedbackPageDto): Promise<unknown> {
    return this.recommendations.get(id, query);
  }
}
