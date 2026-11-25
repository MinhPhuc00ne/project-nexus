import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY, AuthenticatedUserPayload } from './roles.decorator';
import { LightweightJwt } from './jwt.util';
import { PrismaService } from '../prisma/prisma.service';
import { userMode } from './user-mode';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      'super-secret-jwt-key-nexus-change-in-production-2026';

    const verifyResult = LightweightJwt.verify<AuthenticatedUserPayload>(token, secret);

    if (!verifyResult.valid || !verifyResult.payload) {
      if (verifyResult.expired) {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException(verifyResult.error || 'Invalid authentication token');
    }

    const rawPayload = verifyResult.payload as unknown as Record<string, unknown>;
    const userId = (rawPayload.id as string) || (rawPayload.sub as string);
    if (!userId) throw new UnauthorizedException('Invalid authentication token');
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
    if (!account || account.trustLevel === 'SUSPENDED') {
      throw new UnauthorizedException('Account unavailable');
    }
    const userPayload: AuthenticatedUserPayload = {
      ...rawPayload,
      id: userId,
      sub: (rawPayload.sub as string) || userId,
      email: account.email,
      role: account.role as AuthenticatedUserPayload['role'],
      ...userMode(account),
    };

    (request as unknown as { user: AuthenticatedUserPayload }).user = userPayload;
    return true;
  }
}
