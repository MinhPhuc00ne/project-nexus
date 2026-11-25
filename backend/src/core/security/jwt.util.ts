import * as crypto from 'crypto';

export interface JwtSignOptions {
  secret: string;
  expiresInSeconds: number;
}

export interface JwtVerifyResult<T = Record<string, unknown>> {
  valid: boolean;
  expired: boolean;
  payload?: T;
  error?: string;
}

export class LightweightJwt {
  private static base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private static base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  static sign(payload: Record<string, unknown>, options: JwtSignOptions): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const enrichedPayload = {
      ...payload,
      iat: now,
      exp: now + options.expiresInSeconds,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(enrichedPayload));

    const signature = crypto
      .createHmac('sha256', options.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  static verify<T = Record<string, unknown>>(token: string, secret: string): JwtVerifyResult<T> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, expired: false, error: 'Malformed token' };
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      if (signature !== expectedSignature) {
        return { valid: false, expired: false, error: 'Invalid signature' };
      }

      const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as T & { exp?: number };
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        return { valid: false, expired: true, error: 'Token has expired' };
      }

      return { valid: true, expired: false, payload };
    } catch (err: unknown) {
      return {
        valid: false,
        expired: false,
        error: err instanceof Error ? err.message : 'Token verification failed',
      };
    }
  }

  static parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600;
    }
    const val = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return val;
      case 'm':
        return val * 60;
      case 'h':
        return val * 3600;
      case 'd':
        return val * 86400;
      default:
        return 3600;
    }
  }
}
