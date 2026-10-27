import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { CurrentUser, Public, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { BannerDto } from '../dtos/banner.dto';
import { BannerService } from '../services/banner.service';

@Controller()
@ApiTags('Event banners')
export class BannerController {
  constructor(private readonly banners: BannerService) {}
  @Get('catalog/banners')
  @Public()
  listPublic(): Promise<unknown> {
    return this.banners.list(true);
  }
  @Get('staff/banners')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  listAll(): Promise<unknown> {
    return this.banners.list(false);
  }
  @Post('staff/banners')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  create(@CurrentUser('id') id: string, @Body() dto: BannerDto): Promise<unknown> {
    return this.banners.save(id, dto);
  }
  @Put('staff/banners/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: BannerDto,
  ): Promise<unknown> {
    return this.banners.save(userId, dto, id);
  }
  @Delete('staff/banners/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  remove(@Param('id') id: string): Promise<unknown> {
    return this.banners.remove(id);
  }
}
