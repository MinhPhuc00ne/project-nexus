import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '@nexus/types';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const PRIVILEGES_KEY = 'privileges';
export const RequirePrivilege = (privilege: string) => SetMetadata(PRIVILEGES_KEY, privilege);

export interface AuthenticatedUserPayload {
  sub: string;
  id: string;
  email: string;
  role: Role;
  isSellerActive: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserPayload | undefined;
    if (!user) {
      return null;
    }
    if (data === 'id') {
      return user.id || user.sub;
    }
    if (data === 'sub') {
      return user.sub || user.id;
    }
    return data ? user[data] : user;
  },
);
