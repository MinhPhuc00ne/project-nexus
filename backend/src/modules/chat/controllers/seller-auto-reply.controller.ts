import { Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody } from '@nexus/contracts/nest';
import { Role } from '@nexus/types';
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
  @ApiOperation({ summary: 'Lấy danh sách các mẫu tin nhắn tự động của gian hàng' })
  @ApiResponse({ status: 200, description: 'Danh sách tin nhắn tự động.' })
  async getMyAutoReplies(@CurrentUser('id') sellerId: string) {
    const data = await this.autoReplyService.getSellerAutoReplies(sellerId);
    return { data };
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo mới tin nhắn tự động cho gian hàng (Tối đa 10 mẫu)',
    description: 'Tự động kiểm duyệt, chặn từ ngữ cấm hoặc nội dung nhạy cảm.',
  })
  @ApiResponse({ status: 201, description: 'Tạo tin nhắn tự động thành công.' })
  @ApiResponse({ status: 400, description: 'Nội dung chứa từ cấm hoặc vượt quá giới hạn 10 mẫu.' })
  async createAutoReply(
    @CurrentUser('id') sellerId: string,
    @ZodBody(CreateAutoReplySchema) dto: CreateAutoReplyInput,
  ) {
    const data = await this.autoReplyService.createSellerAutoReply(sellerId, dto);
    return { message: 'Tạo tin nhắn tự động thành công.', data };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Chỉnh sửa cấu hình tin nhắn tự động của gian hàng',
    description: 'Không thể chỉnh sửa nếu tin nhắn đã bị Quản trị viên khóa do vi phạm.',
  })
  async updateAutoReply(
    @CurrentUser('id') sellerId: string,
    @Param('id') id: string,
    @ZodBody(UpdateAutoReplySchema) dto: UpdateAutoReplyInput,
  ) {
    const data = await this.autoReplyService.updateSellerAutoReply(sellerId, id, dto);
    return { message: 'Cập nhật tin nhắn tự động thành công.', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa cấu hình tin nhắn tự động của gian hàng' })
  async deleteAutoReply(@CurrentUser('id') sellerId: string, @Param('id') id: string) {
    return this.autoReplyService.deleteSellerAutoReply(sellerId, id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Bật / Tắt trạng thái kích hoạt tin nhắn tự động' })
  async toggleAutoReply(@CurrentUser('id') sellerId: string, @Param('id') id: string) {
    const data = await this.autoReplyService.toggleSellerAutoReply(sellerId, id);
    return {
      message: `Đã ${data.isActive ? 'bật' : 'tắt'} tin nhắn tự động thành công.`,
      data,
    };
  }
}
