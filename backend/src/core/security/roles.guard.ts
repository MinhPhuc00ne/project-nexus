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

  private assertRoles(requiredRoles: Role[] | undefined, userRole: Role): void {
    if (requiredRoles === undefined) {
      return;
    }
    if (requiredRoles.length === 0) {
      throw new ForbiddenException('Roles metadata is empty');
    }
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `User role ${userRole} does not have required permissions: [${requiredRoles.join(', ')}]`,
      );
    }
  }

  private assertPrivilege(requiredPrivilege: string | undefined, userRole: Role): void {
    if (requiredPrivilege === undefined) {
      return;
    }
    const allowedRoles =
      requiredPrivilege.length > 0 &&
      Object.prototype.hasOwnProperty.call(RBAC_PRIVILEGES_MAP, requiredPrivilege)
        ? RBAC_PRIVILEGES_MAP[requiredPrivilege]
        : undefined;
    if (!allowedRoles || allowedRoles.length === 0) {
      throw new ForbiddenException(
        `Privilege '${requiredPrivilege}' is not configured in RBAC policy`,
      );
    }
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Role ${userRole} is not granted privilege '${requiredPrivilege}'`,
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPrivilege = this.reflector.getAllAndOverride<string | undefined>(PRIVILEGES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles === undefined && requiredPrivilege === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    this.assertRoles(requiredRoles, user.role);
    this.assertPrivilege(requiredPrivilege, user.role);

    return true;
  }
}
