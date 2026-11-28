import { Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'node:crypto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody } from '@nexus/contracts/nest';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Public } from '../../../core/security/roles.decorator';
import {
  ChatbotMessageInput,
  ChatbotMessageSchema,
  GuestChatbotMessageInput,
  GuestChatbotMessageSchema,
} from '../dtos/chatbot-message.dto';
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
    summary: 'Guest AI chat for general guidance without order lookups',
    security: [],
  })
  guestReply(
    @Req() request: Request,
    @ZodBody(GuestChatbotMessageSchema) dto: GuestChatbotMessageInput,
  ): Promise<ChatbotReply> {
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
  @ApiOperation({ summary: 'Supported chatbot topics and AI configuration status' })
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
    summary: 'AI chat, personal order/cart lookups, and seller order queries (max 20 messages/min)',
  })
  reply(
    @CurrentUser('id') userId: string,
    @ZodBody(ChatbotMessageSchema) dto: ChatbotMessageInput,
  ): Promise<ChatbotReply> {
    return this.chatbot.reply(userId, dto);
  }
}
