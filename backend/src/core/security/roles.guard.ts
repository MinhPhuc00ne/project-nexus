import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@nexus/types';
import { ROLES_KEY, PRIVILEGES_KEY, AuthenticatedUserPayload } from './roles.decorator';

// RBAC Privilege Map according to docs/srs/README.md Section 4
export const RBAC_PRIVILEGES_MAP: Record<string, Role[]> = {
  'AUTH.LOGIN': [Role.ADMIN, Role.SUPPORT_STAFF, Role.SELLER, Role.BUYER],
  'AUTH.LOGOUT': [Role.ADMIN, Role.SUPPORT_STAFF, Role.SELLER, Role.BUYER],
  'PROFILE.VIEW': [Role.ADMIN, Role.SUPPORT_STAFF, Role.SELLER, Role.BUYER],
  'PROFILE.UPDATE': [Role.SELLER, Role.BUYER],
  'PROFILE.CHANGE_PASSWORD': [Role.ADMIN, Role.SUPPORT_STAFF, Role.SELLER, Role.BUYER],
  'PROFILE.RESET_PASSWORD': [Role.ADMIN, Role.SUPPORT_STAFF, Role.SELLER, Role.BUYER],
  'USER.MANAGE': [Role.ADMIN, Role.SUPPORT_STAFF],
  'USER.REPUTATION.ADJUST': [Role.ADMIN],
  'ROLE.MANAGE': [Role.ADMIN],
  'CATEGORY.MANAGE': [Role.ADMIN],
  'SYSTEM.CONFIG.MANAGE': [Role.ADMIN],
  'PRODUCT.CREATE': [Role.ADMIN, Role.SELLER],
  'PRODUCT.UPDATE': [Role.ADMIN, Role.SELLER],
  'PRODUCT.DELETE': [Role.ADMIN, Role.SELLER],
  'PRODUCT.VIEW': [Role.ADMIN, Role.SUPPORT_STAFF, Role.SELLER, Role.BUYER],
  'CART.MANAGE': [Role.BUYER, Role.SELLER, Role.SUPPORT_STAFF, Role.ADMIN],
  'CHECKOUT.START': [Role.BUYER, Role.SELLER, Role.SUPPORT_STAFF, Role.ADMIN],
  'ORDER.CREATE': [Role.BUYER, Role.SELLER, Role.SUPPORT_STAFF, Role.ADMIN],
  'SHIPPING.QUOTE': [Role.ADMIN, Role.SUPPORT_STAFF, Role.SELLER, Role.BUYER],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPrivilege = this.reflector.getAllAndOverride<string>(PRIVILEGES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !requiredPrivilege) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Role check if requiredRoles provided
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        throw new ForbiddenException(
          `User role ${user.role} does not have required permissions: [${requiredRoles.join(', ')}]`,
        );
      }
    }

    // Privilege check if requiredPrivilege provided
    if (requiredPrivilege) {
      const allowedRoles = RBAC_PRIVILEGES_MAP[requiredPrivilege];
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        throw new ForbiddenException(
          `Role ${user.role} is not granted privilege '${requiredPrivilege}'`,
        );
      }
    }

    return true;
  }
}
