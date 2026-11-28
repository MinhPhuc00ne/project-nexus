import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppErrorCode } from '@nexus/contracts';
import { ReputationTrustLevel, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthenticatedUserPayload } from './roles.decorator';
import { userMode } from './user-mode';

/** Issuer and audience every token this platform mints must carry. */
export const TOKEN_ISSUER = 'nexus';
export const TOKEN_AUDIENCE = 'nexus-api';

/** How long a cached account snapshot stays usable before it is re-read. */
const SESSION_CACHE_TTL_SECONDS = 300;

/** Claims an access token carries. `tv` is the token version, used for revocation. */
export interface AccessTokenClaims {
  sub: string;
  id: string;
  email: string;
  role: Role;
  isSellerActive: boolean;
  tv: number;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

/** The account facts an authenticated request is authorised against. */
interface AccountSnapshot {
  id: string;
  email: string;
  role: Role;
  isSellerActive: boolean;
  isShopSuspended: boolean;
  trustLevel: ReputationTrustLevel;
  tokenVersion: number;
}

function sessionKey(userId: string): string {
  return `auth:session:${userId}`;
}

function tokenVersionKey(userId: string): string {
  return `auth:token-version:${userId}`;
}

/**
 * Issues and verifies access tokens for every entry point: the HTTP guard, the
 * auction, chat and notification WebSocket gateways, and the optional-viewer
 * path in the feedback controller.
 *
 * Before this existed, each of those verified tokens itself with a hand written
 * HMAC comparison, the gateways checked no account state at all, and the HTTP
 * guard paid for a user row on every single request. Here the signature,
 * issuer, audience and expiry are checked by `@nestjs/jwt`, and the account
 * state behind the token is read from Redis with the database as the fallback,
 * so a suspended or logged-out account stops being served on its next request
 * without a query per call.
 */
@Injectable()
export class TokenAuthService {
  private readonly logger = new Logger(TokenAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Access token lifetime. Short by design; clients refresh with the long-lived refresh token. */
  private accessTokenTtl(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
  }

  private secret(): string {
    const secret = this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  /**
   * Mints an access token for an account.
   *
   * @param account - Who the token speaks for.
   * @returns A signed HS256 token carrying the account's current token version.
   */
  async signAccessToken(account: {
    id: string;
    email: string;
    role: Role;
    isSellerActive?: boolean;
  }): Promise<string> {
    const tokenVersion = await this.readTokenVersion(account.id);
    return this.jwtService.signAsync(
      {
        sub: account.id,
        id: account.id,
        email: account.email,
        role: account.role,
        isSellerActive: account.isSellerActive ?? false,
        tv: tokenVersion,
      },
      {
        secret: this.secret(),
        algorithm: 'HS256',
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        expiresIn: this.accessTokenTtl() as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
  }

  /**
   * Verifies a token and resolves the account behind it.
   *
   * @param token - A bare JWT, without the `Bearer ` prefix.
   * @returns The authenticated user a request handler can trust.
   * @throws UnauthorizedException when the token or the account is not usable.
   */
  async authenticate(token: string): Promise<AuthenticatedUserPayload> {
    const claims = await this.verifyToken(token);
    const userId = claims.sub || claims.id;
    if (!userId) {
      throw new UnauthorizedException({
        message: 'Invalid authentication token',
        errorCode: AppErrorCode.UNAUTHORIZED,
      });
    }

    const account = await this.resolveAccount(userId);
    if (!account) {
      throw new UnauthorizedException({
        message: 'Account unavailable',
        errorCode: AppErrorCode.UNAUTHORIZED,
      });
    }
    if (account.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new UnauthorizedException({
        message: 'Account unavailable',
        errorCode: AppErrorCode.ACCOUNT_SUSPENDED,
      });
    }
    if ((claims.tv ?? 0) < account.tokenVersion) {
      throw new UnauthorizedException({
        message: 'Session has been revoked',
        errorCode: AppErrorCode.UNAUTHORIZED,
      });
    }

    return {
      ...claims,
      id: account.id,
      sub: account.id,
      email: account.email,
      role: account.role,
      ...userMode(account),
    } as AuthenticatedUserPayload;
  }

  /**
   * Verifies a token's signature and registered claims without touching account state.
   *
   * @param token - A bare JWT.
   * @returns The decoded claims.
   * @throws UnauthorizedException for a malformed, foreign, expired or badly signed token.
   */
  async verifyToken(token: string): Promise<AccessTokenClaims> {
    try {
      return await this.jwtService.verifyAsync<AccessTokenClaims>(token, {
        secret: this.secret(),
        algorithms: ['HS256'],
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.toLowerCase().includes('expired')) {
        throw new UnauthorizedException({
          message: 'Token has expired',
          errorCode: AppErrorCode.UNAUTHORIZED,
        });
      }
      throw new UnauthorizedException({
        message: 'Invalid authentication token',
        errorCode: AppErrorCode.UNAUTHORIZED,
      });
    }
  }

  /**
   * Authenticates a token without throwing, for endpoints that serve guests and
   * members alike.
   *
   * @param token - A bare JWT, or nothing.
   * @returns The authenticated user, or undefined when the token is absent or unusable.
   */
  async authenticateOptional(token?: string): Promise<AuthenticatedUserPayload | undefined> {
    if (!token) return undefined;
    try {
      return await this.authenticate(token);
    } catch {
      return undefined;
    }
  }

  /**
   * Revokes every access token already issued to an account.
   *
   * Call this whenever the account's standing changes under it: a password
   * change, a suspension, or a sign-out of all sessions.
   *
   * @param userId - Whose tokens stop being accepted.
   * @returns Completion.
   */
  async revokeAllSessions(userId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.incr(tokenVersionKey(userId));
      await client.del(sessionKey(userId));
    } catch (error) {
      // A token version that cannot be bumped would leave a revoked session
      // alive, so this must be loud rather than silently ignored.
      this.logger.error(
        `Failed to revoke sessions for user ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw error;
    }
  }

  /**
   * Drops the cached account snapshot so the next request re-reads it.
   *
   * @param userId - Whose snapshot is stale.
   * @returns Completion.
   */
  async invalidateAccountCache(userId: string): Promise<void> {
    try {
      await this.redis.getClient().del(sessionKey(userId));
    } catch {
      // A stale snapshot expires on its own within SESSION_CACHE_TTL_SECONDS.
    }
  }

  private async readTokenVersion(userId: string): Promise<number> {
    try {
      const raw = await this.redis.get(tokenVersionKey(userId));
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  private async resolveAccount(userId: string): Promise<AccountSnapshot | null> {
    const cached = await this.readCachedAccount(userId);
    if (cached) return cached;

    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isSellerActive: true,
        isShopSuspended: true,
        trustLevel: true,
      },
    });
    if (!account) return null;

    const snapshot: AccountSnapshot = {
      ...account,
      tokenVersion: await this.readTokenVersion(userId),
    };
    await this.cacheAccount(snapshot);
    return snapshot;
  }

  private async readCachedAccount(userId: string): Promise<AccountSnapshot | null> {
    try {
      const raw = await this.redis.get(sessionKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AccountSnapshot;
      return parsed.id === userId ? parsed : null;
    } catch {
      // An unreadable cache falls through to the database rather than failing
      // the request: Redis being down must not log everybody out.
      return null;
    }
  }

  private async cacheAccount(snapshot: AccountSnapshot): Promise<void> {
    try {
      await this.redis.set(
        sessionKey(snapshot.id),
        JSON.stringify(snapshot),
        SESSION_CACHE_TTL_SECONDS,
      );
    } catch {
      // Caching is an optimisation; the database already answered.
    }
  }
}
