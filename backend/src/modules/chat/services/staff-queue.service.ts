import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';

export interface OnlineStaffSession {
  staffId: string;
  socketIds: Set<string>;
  connectedAt: number;
  activeTickets: Set<string>;
}

/** Staff whose socket has gone without a heartbeat for this long are dropped. */
const SESSION_TTL_SECONDS = 300;

const ONLINE_KEY = 'nexus:chat:staff-online';
const socketsKey = (staffId: string) => `nexus:chat:staff:${staffId}:sockets`;
const ticketsKey = (staffId: string) => `nexus:chat:staff:${staffId}:tickets`;

/**
 * Tracks which support staff are online and how many tickets each is handling.
 *
 * This lived in a `Map` on the service, which made it a single-instance
 * feature: a second backend instance saw an empty queue and handed the same
 * ticket to a second member of staff, and a restart lost every assignment while
 * the conversations stayed open in the database. It is held in Redis, which the
 * platform already runs, so every instance sees the same queue.
 *
 * Every read falls back to treating staff as offline when Redis cannot be
 * reached. That is the safe direction: a ticket waits in the queue instead of
 * being assigned to somebody who is not there.
 */
@Injectable()
export class StaffQueueService {
  private readonly logger = new Logger(StaffQueueService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Records a staff socket as connected.
   *
   * Several tabs are one session: the earliest connection time is kept, because
   * the queue hands the next ticket to whoever has been waiting longest.
   *
   * @param staffId - Who connected.
   * @param socketId - The socket that connected.
   * @returns Completion.
   */
  async registerOnlineStaff(staffId: string, socketId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      const sockets = socketsKey(staffId);

      await client.sadd(sockets, socketId);
      await client.expire(sockets, SESSION_TTL_SECONDS);

      // Only the first connection sets the timestamp, so opening a second tab
      // does not send this member of staff to the back of the queue.
      const added = await client.zadd(ONLINE_KEY, 'NX', Date.now(), staffId);
      if (added === 1) {
        this.logger.log(`Staff ${staffId} is now ONLINE.`);
      }
    } catch (error) {
      this.logger.error(
        `Could not register staff ${staffId} as online: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  /**
   * Drops one socket, and the staff member when it was their last.
   *
   * @param staffId - Who disconnected.
   * @param socketId - The socket that closed.
   * @returns Completion.
   */
  async unregisterStaff(staffId: string, socketId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      const sockets = socketsKey(staffId);

      await client.srem(sockets, socketId);
      const remaining = await client.scard(sockets);
      if (remaining > 0) return;

      await client.zrem(ONLINE_KEY, staffId);
      await client.del(sockets);
      await client.del(ticketsKey(staffId));
      this.logger.log(`Staff ${staffId} is now completely OFFLINE from the system.`);
    } catch (error) {
      this.logger.error(
        `Could not unregister staff ${staffId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  /** Whether this member of staff has at least one open socket. */
  async isStaffOnline(staffId: string): Promise<boolean> {
    try {
      return (await this.redis.getClient().zscore(ONLINE_KEY, staffId)) !== null;
    } catch {
      return false;
    }
  }

  /** How many members of staff are online. */
  async getOnlineStaffCount(): Promise<number> {
    try {
      return await this.redis.getClient().zcard(ONLINE_KEY);
    } catch {
      return 0;
    }
  }

  /**
   * Lists online staff, longest-connected first.
   *
   * @returns One entry per member of staff, with how many tickets they hold.
   */
  async getOnlineStaffList(): Promise<
    Array<{ staffId: string; connectedAt: number; activeCount: number }>
  > {
    try {
      const client = this.redis.getClient();
      // ioredis types the WITHSCORES variant loosely; the reply is the flat
      // [member, score, member, score, ...] array Redis documents.
      const raw = await (
        client as unknown as {
          zrange(key: string, start: number, stop: number, withScores: string): Promise<string[]>;
        }
      ).zrange(ONLINE_KEY, 0, -1, 'WITHSCORES');

      const entries: Array<{ staffId: string; connectedAt: number; activeCount: number }> = [];
      for (let index = 0; index < raw.length; index += 2) {
        const staffId = raw[index];
        const connectedAt = Number(raw[index + 1]);
        const activeCount = await client.scard(ticketsKey(staffId));
        entries.push({ staffId, connectedAt, activeCount });
      }
      return entries;
    } catch (error) {
      this.logger.error(
        `Could not read the online staff list: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return [];
    }
  }

  /**
   * Picks who should take the next ticket.
   *
   * Whoever has been online longest and is still under their concurrent limit.
   *
   * @param maxConcurrent - How many tickets one member of staff may hold.
   * @returns The chosen staff id, or null when nobody is available.
   */
  async getNextAvailableStaff(maxConcurrent = 5): Promise<string | null> {
    const candidates = (await this.getOnlineStaffList()).filter(
      (entry) => entry.activeCount < maxConcurrent,
    );
    return candidates.length > 0 ? candidates[0].staffId : null;
  }

  /**
   * Records that a member of staff is handling a conversation.
   *
   * @param staffId - Who took it.
   * @param conversationId - Which conversation.
   * @returns Completion.
   */
  async trackAssignedTicket(staffId: string, conversationId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.sadd(ticketsKey(staffId), conversationId);
      await client.expire(ticketsKey(staffId), SESSION_TTL_SECONDS);
    } catch {
      // A lost assignment means the queue may hand out one ticket too many, so
      // it is logged rather than silently swallowed.
      this.logger.warn(`Could not track ticket ${conversationId} for staff ${staffId}.`);
    }
  }

  /**
   * Frees a conversation once it is resolved or closed.
   *
   * @param staffId - Who held it.
   * @param conversationId - Which conversation.
   * @returns Completion.
   */
  async releaseAssignedTicket(staffId: string, conversationId: string): Promise<void> {
    try {
      await this.redis.getClient().srem(ticketsKey(staffId), conversationId);
    } catch {
      this.logger.warn(`Could not release ticket ${conversationId} for staff ${staffId}.`);
    }
  }

  /**
   * Replaces a member of staff's held conversations with what the database says.
   *
   * Called when they reconnect, so a restart does not leave the queue believing
   * they are still holding tickets they have since finished.
   *
   * @param staffId - Whose assignments to replace.
   * @param conversationIds - The conversations they are actually handling.
   * @returns Completion.
   */
  async syncActiveTickets(staffId: string, conversationIds: string[]): Promise<void> {
    try {
      const client = this.redis.getClient();
      const key = ticketsKey(staffId);
      await client.del(key);
      if (conversationIds.length > 0) {
        await client.sadd(key, ...conversationIds);
        await client.expire(key, SESSION_TTL_SECONDS);
      }
    } catch {
      this.logger.warn(`Could not sync active tickets for staff ${staffId}.`);
    }
  }
}
