import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';

const MAX_AGE_SECONDS = 300;
const passwordVersion = (hash: string): string => createHash('sha256').update(hash).digest('hex');

export function recentReauthentication(passwordHash: string): string {
  return JSON.stringify({ verifiedAt: Date.now(), version: passwordVersion(passwordHash) });
}

@Injectable()
export class ProfileReauthService {
  private readonly proofSecret: string;

  constructor(
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    const accessSecret =
      config.get<string>('JWT_SECRET') ||
      process.env.JWT_SECRET ||
      'super-secret-jwt-key-nexus-change-in-production-2026';
    this.proofSecret = createHmac('sha256', accessSecret)
      .update('PROFILE_UPDATE_PROOF')
      .digest('hex');
  }

  async issue(
    user: { id: string; passwordHash: string },
    password: string,
  ): Promise<{
    verificationToken: string;
    expiresIn: number;
  }> {
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ForbiddenException('Mật khẩu xác minh không chính xác.');
    }
    const verificationToken = await this.jwt.signAsync(
      { sub: user.id, purpose: 'PROFILE_UPDATE', version: passwordVersion(user.passwordHash) },
      {
        secret: this.proofSecret,
        audience: 'profile-reauthentication',
        expiresIn: MAX_AGE_SECONDS,
      },
    );
    return { verificationToken, expiresIn: MAX_AGE_SECONDS };
  }

  async assert(
    user: { id: string; role: string; passwordHash: string },
    proof?: {
      password?: string;
      verificationToken?: string;
    },
  ): Promise<void> {
    if (user.role !== 'SELLER') return;
    if (
      proof?.password &&
      user.passwordHash &&
      (await bcrypt.compare(proof.password, user.passwordHash))
    )
      return;
    if (proof?.verificationToken) {
      try {
        const payload = await this.jwt.verifyAsync<{
          sub?: string;
          purpose?: string;
          version?: string;
        }>(proof.verificationToken, {
          secret: this.proofSecret,
          audience: 'profile-reauthentication',
        });
        if (
          payload.sub === user.id &&
          payload.purpose === 'PROFILE_UPDATE' &&
          payload.version === passwordVersion(user.passwordHash)
        )
          return;
      } catch {
        // Access/refresh tokens and expired proofs cannot substitute for reauthentication.
      }
    }
    try {
      const cached = await this.redis.get(`seller_recent_reauth:${user.id}`);
      if (cached) {
        const record: unknown = JSON.parse(cached);
        if (
          record &&
          typeof record === 'object' &&
          'verifiedAt' in record &&
          typeof record.verifiedAt === 'number' &&
          'version' in record &&
          record.version === passwordVersion(user.passwordHash) &&
          Date.now() - record.verifiedAt >= 0 &&
          Date.now() - record.verifiedAt < MAX_AGE_SECONDS * 1000
        )
          return;
      }
    } catch {
      // Redis outages must not bypass verification; direct password/proof remains available.
    }
    throw new ForbiddenException(
      'Vui lòng xác minh lại mật khẩu trong vòng 5 phút trước khi sửa hồ sơ Seller.',
    );
  }
}
