import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../../modules/auth/auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

@Injectable()
export class TenantRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: { organizationId?: string };
    }>();

    const user = request.user;
    const organizationId = request.params.organizationId;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (!organizationId) {
      return true; // Not a tenant-scoped route
    }

    // Platform admin bypasses tenant membership for administrative visibility
    if (user.isPlatformAdmin) {
      return true;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to this organization');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const userLevel = ROLE_HIERARCHY[membership.role];
    const hasRole = requiredRoles.some((role) => userLevel >= ROLE_HIERARCHY[role]);

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: [${requiredRoles.join(', ')}], current: ${membership.role}`,
      );
    }

    return true;
  }
}
