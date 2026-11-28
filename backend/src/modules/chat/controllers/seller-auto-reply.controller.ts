import { Controller, Delete, Get, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  CreateAutoReplyInput,
  CreateAutoReplySchema,
  UpdateAutoReplyInput,
  UpdateAutoReplySchema,
} from '../dtos/auto-reply.dto';
import { ChatAutoReplyService } from '../services/chat-auto-reply.service';

@ApiTags('Seller Chat Auto-Reply')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER)
@Controller('chat/auto-replies/my-shop')
export class SellerAutoReplyController {
  constructor(private readonly autoReplyService: ChatAutoReplyService) {}

  @Get()
  @ApiOperation({ summary: 'List shop auto-reply templates (Seller)' })
  @ApiResponse({ status: 200, description: 'Auto-reply templates.' })
  async getMyAutoReplies(@CurrentUser('id') sellerId: string) {
    const data = await this.autoReplyService.getSellerAutoReplies(sellerId);
    return { data };
  }

  @Post()
  @ApiOperation({
    summary: 'Create a shop auto-reply template (max 10 templates)',
    description: 'Automatically moderates prohibited or sensitive content.',
  })
  @ApiResponse({ status: 201, description: 'Auto-reply created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Content contains prohibited words or exceeds the 10-template limit.',
  })
  async createAutoReply(
    @CurrentUser('id') sellerId: string,
    @ZodBody(CreateAutoReplySchema) dto: CreateAutoReplyInput,
  ) {
    const data = await this.autoReplyService.createSellerAutoReply(sellerId, dto);
    return { message: 'Auto-reply created successfully.', data };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a shop auto-reply configuration',
    description: 'Cannot be edited if locked by Admin due to a policy violation.',
  })
  async updateAutoReply(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(UpdateAutoReplySchema) dto: UpdateAutoReplyInput,
  ) {
    const data = await this.autoReplyService.updateSellerAutoReply(sellerId, id, dto);
    return { message: 'Auto-reply updated successfully.', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shop auto-reply configuration' })
  async deleteAutoReply(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) id: string,
  ) {
    return this.autoReplyService.deleteSellerAutoReply(sellerId, id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Enable or disable an auto-reply template' })
  async toggleAutoReply(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) id: string,
  ) {
    const data = await this.autoReplyService.toggleSellerAutoReply(sellerId, id);
    return {
      message: `Auto-reply ${data.isActive ? 'enabled' : 'disabled'} successfully.`,
      data,
    };
  }
}
