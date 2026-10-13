import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (!req || !req.headers) return null;
          const authHeader = req.headers.authorization;
          if (!authHeader) return null;
          // Tự động làm sạch các trường hợp dán thừa chữ "Bearer " hoặc dán raw token trên Swagger UI
          const cleanToken = authHeader.replace(/^(Bearer\s+)+/i, '').trim();
          return cleanToken || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'nexus-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, userId: payload.sub, email: payload.email, role: payload.role };
  }
}
