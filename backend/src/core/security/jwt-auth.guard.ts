import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY, AuthenticatedUserPayload } from './roles.decorator';
import { LightweightJwt } from './jwt.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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
    const userPayload: AuthenticatedUserPayload = {
      ...rawPayload,
      id: userId,
      sub: (rawPayload.sub as string) || userId,
      email: (rawPayload.email as string) || '',
      role: rawPayload.role as AuthenticatedUserPayload['role'],
      isSellerActive: Boolean(rawPayload.isSellerActive),
    };

    (request as unknown as { user: AuthenticatedUserPayload }).user = userPayload;
    return true;
  }
}
