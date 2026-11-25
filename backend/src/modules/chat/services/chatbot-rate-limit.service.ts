import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';

const consume = `local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], 60) end
return count`;

/** Enforces atomic Redis per-minute rate limits for chatbot requests, failing closed on outage. */
@Injectable()
export class ChatbotRateLimitService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Increments and validates the 60-second request quota for a user or guest identity.
   * @param userId User UUID or hashed guest identity key.
   * @throws ServiceUnavailableException when Redis is unreachable or returns an invalid counter.
   * @throws HttpException with status 429 when the 20-request-per-minute quota is exceeded.
   */
  async check(userId: string): Promise<void> {
    let count: unknown;
    try {
      count = await this.redis.getClient().eval(consume, 1, `chatbot:rate:${userId}`);
    } catch {
      throw new ServiceUnavailableException('Chatbot tạm gián đoạn. Vui lòng thử lại sau.');
    }
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1)
      throw new ServiceUnavailableException('Chatbot tạm gián đoạn. Vui lòng thử lại sau.');
    if (count > 20)
      throw new HttpException('Bạn gửi quá nhiều tin nhắn. Vui lòng thử lại sau một phút.', 429);
  }
}
