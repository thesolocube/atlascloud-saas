import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AddMemberDto } from './dto/add-member.dto';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(organizationId: string, actorUserId: string, dto: AddMemberDto) {
    const userToAdd = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!userToAdd) {
      throw new NotFoundException('User with this email not found');
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this organization');
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          organizationId,
          userId: userToAdd.id,
          role: dto.role,
        },
        include: {
          user: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          action: 'MEMBER_ADDED',
          resourceType: 'membership',
          resourceId: membership.id,
          metadata: { addedUserId: userToAdd.id, role: dto.role },
        },
      });

      return membership;
    });
  }

  async updateMemberRole(
    organizationId: string,
    membershipId: string,
    actorUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const target = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!target || target.organizationId !== organizationId) {
      throw new NotFoundException('Membership record not found');
    }

    if (target.role === 'OWNER' && dto.role !== 'OWNER') {
      const owners = await this.prisma.membership.count({
        where: { organizationId, role: 'OWNER' },
      });
      if (owners <= 1) {
        throw new BadRequestException('Cannot demote the sole organization owner');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: membershipId },
        data: { role: dto.role },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          action: 'MEMBER_ROLE_CHANGED',
          resourceType: 'membership',
          resourceId: membershipId,
          metadata: { previousRole: target.role, newRole: dto.role },
        },
      });

      return updated;
    });
  }

  async removeMember(organizationId: string, membershipId: string, actorUserId: string) {
    const target = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!target || target.organizationId !== organizationId) {
      throw new NotFoundException('Membership record not found');
    }

    if (target.role === 'OWNER') {
      const owners = await this.prisma.membership.count({
        where: { organizationId, role: 'OWNER' },
      });
      if (owners <= 1) {
        throw new BadRequestException('Cannot remove the sole organization owner');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.membership.delete({
        where: { id: membershipId },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          action: 'MEMBER_REMOVED',
          resourceType: 'membership',
          resourceId: membershipId,
          metadata: { removedUserId: target.userId },
        },
      });
    });

    return { message: 'Member removed successfully' };
  }
}
