import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppErrorCode } from '@nexus/contracts';
import { Request } from 'express';
import { IS_PUBLIC_KEY, AuthenticatedUserPayload } from './roles.decorator';
import { TokenAuthService } from './token-auth.service';

/**
 * Authenticates an HTTP request and attaches the account it speaks for.
 *
 * Verification and the account-standing check both live in TokenAuthService, so
 * this guard and the WebSocket gateways accept exactly the same tokens under
 * exactly the same conditions.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenAuth: TokenAuthService,
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
      throw new UnauthorizedException({
        message: 'Missing or invalid Authorization header',
        errorCode: AppErrorCode.UNAUTHORIZED,
      });
    }

    const user = await this.tokenAuth.authenticate(authHeader.substring(7));
    (request as unknown as { user: AuthenticatedUserPayload }).user = user;
    return true;
  }
}
