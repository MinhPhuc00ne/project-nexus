import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RedisService } from '../../../core/redis/redis.service';

/** How long a browser has to redeem an OAuth handoff code. */
const CODE_TTL_SECONDS = 60;

/** The session an OAuth sign-in produced, held until the browser collects it. */
export interface OAuthHandoff {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}

function codeKey(code: string): string {
  return `auth:oauth-code:${code}`;
}

/**
 * Holds a completed OAuth sign-in behind a single-use code.
 *
 * The Google callback used to redirect to the frontend with the access token,
 * the refresh token and the whole user object in the query string, which puts
 * live credentials into browser history, the `Referer` header of whatever the
 * page loads next, and any proxy or server log along the way. Now the callback
 * redirects with nothing but an opaque code, and the frontend exchanges it for
 * the session over POST.
 */
@Injectable()
export class OAuthCodeService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Stores a session and returns the code that redeems it.
   *
   * @param handoff - The tokens and profile the browser will collect.
   * @returns A single-use code, valid for 60 seconds.
   */
  async issue(handoff: OAuthHandoff): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.redis.set(codeKey(code), JSON.stringify(handoff), CODE_TTL_SECONDS);
    return code;
  }

  /**
   * Redeems a code, consuming it so a replay cannot reuse it.
   *
   * @param code - The code from the redirect.
   * @returns The session the code stood for.
   * @throws UnauthorizedException when the code is unknown, expired or already used.
   */
  async redeem(code: string): Promise<OAuthHandoff> {
    const key = codeKey(code);
    let raw: string | null;
    if (typeof this.redis.getDel === 'function') {
      raw = await this.redis.getDel(key);
    } else {
      raw = await this.redis.get(key);
      await this.redis.del(key);
    }

    if (!raw) {
      throw new UnauthorizedException('Sign-in code is invalid or has expired.');
    }

    try {
      return JSON.parse(raw) as OAuthHandoff;
    } catch {
      throw new UnauthorizedException('Sign-in code is invalid or has expired.');
    }
  }
}
