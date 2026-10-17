import { Injectable, NotFoundException } from '@nestjs/common';
import type { OrganizationStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const [organizationsCount, usersCount, projectsCount, jobsCount, failedJobsCount] =
      await Promise.all([
        this.prisma.organization.count(),
        this.prisma.user.count(),
        this.prisma.project.count(),
        this.prisma.job.count(),
        this.prisma.job.count({ where: { status: 'FAILED' } }),
      ]);

    return {
      organizationsCount,
      usersCount,
      projectsCount,
      jobsCount,
      failedJobsCount,
      timestamp: new Date().toISOString(),
    };
  }

  async listAllOrganizations(limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { memberships: true, projects: true, jobs: true },
          },
        },
      }),
      this.prisma.organization.count(),
    ]);

    return { items, total, limit, offset };
  }

  async updateOrganizationStatus(
    organizationId: string,
    status: OrganizationStatus,
    adminUserId: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: organizationId },
        data: { status },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: adminUserId,
          action: status === 'SUSPENDED' ? 'ORG_SUSPENDED' : 'ORG_REACTIVATED',
          resourceType: 'organization',
          resourceId: organizationId,
          metadata: { previousStatus: org.status, newStatus: status },
        },
      });

      return updated;
    });
  }

  async listFailedJobs(limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where: { status: 'FAILED' },
        take: limit,
        skip: offset,
        orderBy: { completedAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          requestedBy: { select: { id: true, email: true, displayName: true } },
        },
      }),
      this.prisma.job.count({ where: { status: 'FAILED' } }),
    ]);

    return { items, total, limit, offset };
  }
}
