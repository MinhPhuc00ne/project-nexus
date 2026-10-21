import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../core/prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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
        configService.get<string>('JWT_SECRET') ||
        process.env.JWT_SECRET ||
        'super-secret-jwt-key-nexus-change-in-production-2026',
    });
  }

  async validate(payload: JwtPayload) {
    let role = payload.role;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { role: true, isSellerActive: true },
      });
      if (user) {
        role = user.role;
      }
    } catch {
      // Fallback to token payload role if db query fails
    }
    return { id: payload.sub, userId: payload.sub, email: payload.email, role };
  }
}
