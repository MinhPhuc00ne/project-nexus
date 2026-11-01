import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'node:crypto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Public } from '../../../core/security/roles.decorator';
import { ChatbotMessageDto, GuestChatbotMessageDto } from '../dtos/chatbot-message.dto';
import { ChatbotReply, ChatbotService } from '../services/chatbot.service';

@ApiTags('Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat/bot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Public()
  @Post('guest/messages')
  @HttpCode(200)
  @ApiOperation({
    summary: 'FAQ cho khách chưa đăng nhập; không tra cứu đơn hoặc gọi AI',
    security: [],
  })
  guestReply(@Req() request: Request, @Body() dto: GuestChatbotMessageDto): Promise<ChatbotReply> {
    // Use the transport peer, not a client-supplied ID or forwarded header.
    const peer = request.socket.remoteAddress ?? 'unknown';
    const address = peer.startsWith('::ffff:') ? peer.slice(7) : peer;
    const identity = createHash('sha256').update(address).digest('hex');
    return this.chatbot.replyGuest(identity, dto);
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Chủ đề hỗ trợ và tình trạng cấu hình AI' })
  capabilities(): ReturnType<ChatbotService['capabilities']> {
    return this.chatbot.capabilities();
  }

  @Post('messages')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Hỏi chatbot hoặc tra cứu đơn của tài khoản đăng nhập; tối đa 20 tin/phút',
  })
  reply(@CurrentUser('id') userId: string, @Body() dto: ChatbotMessageDto): Promise<ChatbotReply> {
    return this.chatbot.reply(userId, dto);
  }
}
