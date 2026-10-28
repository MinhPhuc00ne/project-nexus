import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { userMode } from '../../../core/security/user-mode';
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
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        role: true,
        email: true,
        isSellerActive: true,
        isShopSuspended: true,
        trustLevel: true,
      },
    });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại.');
    if (user.trustLevel === 'SUSPENDED') throw new ForbiddenException('Tài khoản đã bị khóa.');
    return {
      id: payload.sub,
      userId: payload.sub,
      email: user.email,
      role: user.role,
      isShopSuspended: user.isShopSuspended,
      ...userMode(user),
    };
  }
}
