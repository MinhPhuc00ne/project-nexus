import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/roles.decorator';
import { ChatbotMessageDto } from '../dtos/chatbot-message.dto';
import { ChatbotReply, ChatbotService } from '../services/chatbot.service';

@ApiTags('Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat/bot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

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
