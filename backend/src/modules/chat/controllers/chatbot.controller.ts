import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'node:crypto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Public } from '../../../core/security/roles.decorator';
import { ChatbotMessageDto, GuestChatbotMessageDto } from '../dtos/chatbot-message.dto';
import { ChatbotReply, ChatbotService } from '../services/chatbot.service';

/** Exposes conversational AI and commerce read endpoints under `/api/v1/chat/bot`. */
@ApiTags('Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat/bot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  /**
   * Handles public guest chatbot messages using Express-resolved peer identity for rate limiting.
   * @param request Incoming HTTP request.
   * @param dto Validated guest message payload.
   * @returns General guidance reply prompting login for protected actions.
   */
  @Public()
  @Post('guest/messages')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Hội thoại AI cho khách chưa đăng nhập; chỉ hướng dẫn chung, không tra cứu đơn',
    security: [],
  })
  guestReply(@Req() request: Request, @Body() dto: GuestChatbotMessageDto): Promise<ChatbotReply> {
    const peer = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const address = peer.startsWith('::ffff:') ? peer.slice(7) : peer;
    const identity = createHash('sha256').update(address).digest('hex');
    return this.chatbot.replyGuest(identity, dto);
  }

  /**
   * Returns supported chatbot knowledge topics and whether Gemini AI is configured.
   * @returns Topic catalog and AI availability state.
   */
  @Get('capabilities')
  @ApiOperation({ summary: 'Chủ đề hỗ trợ và tình trạng cấu hình AI' })
  capabilities(): ReturnType<ChatbotService['capabilities']> {
    return this.chatbot.capabilities();
  }

  /**
   * Handles authenticated user messages, supporting personal order/cart lookups and AI conversation.
   * @param userId Authenticated user identifier from JWT.
   * @param dto Validated message and optional filter parameters.
   * @returns Structured assistant reply.
   */
  @Post('messages')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Hội thoại, lịch sử đặt hàng cho mọi role, đơn bán và giỏ hàng cá nhân; tối đa 20 tin/phút',
  })
  reply(@CurrentUser('id') userId: string, @Body() dto: ChatbotMessageDto): Promise<ChatbotReply> {
    return this.chatbot.reply(userId, dto);
  }
}
