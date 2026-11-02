import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chatbotKnowledge, ChatbotTopic } from './chatbot-knowledge';
import { ChatbotHistoryMessageDto } from '../dtos/chatbot-message.dto';
import { chatbotSystemPrompt } from './chatbot-system-prompt';

export interface ChatbotAiAnswer {
  reply: string;
  topic: ChatbotTopic | 'WELCOME' | 'UNKNOWN';
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

@Injectable()
export class ChatbotAiService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return (
      this.config.get<string>('CHATBOT_AI_ENABLED') === 'true' &&
      Boolean(this.config.get<string>('GEMINI_API_KEY')?.trim()) &&
      /^gemini-[a-z0-9.-]+$/.test(this.config.get<string>('CHATBOT_GEMINI_MODEL') ?? '')
    );
  }

  async answer(
    message: string,
    history: ChatbotHistoryMessageDto[] = [],
    authenticated = true,
  ): Promise<ChatbotAiAnswer | null> {
    if (!this.isConfigured()) return null;
    const topics = chatbotKnowledge.map(({ id, title }) => ({ id, title }));
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.get<string>('CHATBOT_GEMINI_MODEL')}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.config.get<string>('GEMINI_API_KEY') ?? '',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: chatbotSystemPrompt(authenticated),
                },
              ],
            },
            contents: [
              ...history.slice(-12).map((turn) => ({
                role: turn.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: turn.content }],
              })),
              { role: 'user', parts: [{ text: message }] },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  reply: { type: 'STRING' },
                  topic: {
                    type: 'STRING',
                    enum: [...topics.map((t) => t.id), 'WELCOME', 'UNKNOWN'],
                  },
                },
                required: ['reply', 'topic'],
              },
            },
          }),
          signal: AbortSignal.timeout(15000),
          redirect: 'error',
        },
      );
      if (!response.ok) return null;
      const body = record(await response.json());
      const candidate = Array.isArray(body.candidates) ? record(body.candidates[0]) : {};
      if (candidate.finishReason !== 'STOP') return null;
      const parts = record(candidate.content).parts;
      if (!Array.isArray(parts)) return null;
      const text = parts
        .filter((part: unknown) => record(part).thought !== true)
        .map((part: unknown) => record(part).text)
        .filter((part) => typeof part === 'string')
        .join('');
      if (text.length > 16000) return null;
      const result = record(JSON.parse(text));
      const topic = [...topics.map((t) => t.id), 'WELCOME', 'UNKNOWN'].find(
        (id) => id === result.topic,
      );
      if (
        !topic ||
        typeof result.reply !== 'string' ||
        !result.reply.trim() ||
        result.reply.length > 2000
      )
        return null;
      return { reply: result.reply.trim(), topic: topic as ChatbotAiAnswer['topic'] };
    } catch {
      return null;
    }
  }
}
