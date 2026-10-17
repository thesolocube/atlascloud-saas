import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { CreateOrganizationDto } from './dto/create-organization.dto';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`An organization with slug '${dto.slug}' already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          status: 'ACTIVE',
        },
      });

      // Creator automatically becomes OWNER
      await tx.membership.create({
        data: {
          organizationId: org.id,
          userId,
          role: 'OWNER',
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorUserId: userId,
          action: 'ORG_CREATED',
          resourceType: 'organization',
          resourceId: org.id,
          metadata: { name: org.name, slug: org.slug },
        },
      });

      return org;
    });
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m) => ({
      organization: m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async findById(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async update(organizationId: string, actorUserId: string, dto: UpdateOrganizationDto) {
    const org = await this.findById(organizationId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.organization.update({
        where: { id: organizationId },
        data: {
          ...(dto.name && { name: dto.name }),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          action: 'ORG_UPDATED',
          resourceType: 'organization',
          resourceId: organizationId,
          metadata: { previousName: org.name, newName: dto.name },
        },
      });

      return result;
    });

    return updated;
  }
}
