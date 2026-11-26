import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';

/** A connection record is dropped if nothing refreshes it for this long. */
const PRESENCE_TTL_SECONDS = 300;

const socketsKey = (userId: string) => `nexus:chat:presence:${userId}`;

/**
 * Tracks who currently holds an open chat socket.
 *
 * Presence used to be answered by asking the Socket.IO server which clients
 * were in a room, which only ever described the instance that happened to
 * serve the request: with two backends, a shop owner connected to one of them
 * looked offline to the other, and their customers were told nobody was there.
 * Holding it in Redis gives every instance the same answer.
 *
 * Any failure reads as offline. For an auto-reply that is the harmless
 * direction: the customer is told the shop may be away rather than being left
 * with silence.
 */
@Injectable()
export class ChatPresenceService {
  private readonly logger = new Logger(ChatPresenceService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Records a socket as connected for an account.
   *
   * @param userId - Who connected.
   * @param socketId - The socket that connected.
   * @returns Completion.
   */
  async connect(userId: string, socketId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.sadd(socketsKey(userId), socketId);
      await client.expire(socketsKey(userId), PRESENCE_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(
        `Could not record presence for ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  /**
   * Drops one socket, and the account once its last socket closes.
   *
   * @param userId - Who disconnected.
   * @param socketId - The socket that closed.
   * @returns Completion.
   */
  async disconnect(userId: string, socketId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.srem(socketsKey(userId), socketId);
      if ((await client.scard(socketsKey(userId))) === 0) {
        await client.del(socketsKey(userId));
      }
    } catch {
      // The key expires on its own if this fails.
    }
  }

  /**
   * Whether an account holds any open chat socket.
   *
   * @param userId - Which account.
   * @returns True when at least one socket is open anywhere in the cluster.
   */
  async isOnline(userId: string): Promise<boolean> {
    try {
      return (await this.redis.getClient().scard(socketsKey(userId))) > 0;
    } catch {
      return false;
    }
  }
}
