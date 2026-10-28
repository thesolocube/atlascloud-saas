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

  async getDatabaseOverview() {
    const [
      users,
      organizations,
      memberships,
      projects,
      jobs,
      outboxEvents,
      auditLogs,
      refreshSessions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.membership.count(),
      this.prisma.project.count(),
      this.prisma.job.count(),
      this.prisma.outboxEvent.count(),
      this.prisma.auditLog.count(),
      this.prisma.refreshSession.count(),
    ]);

    return {
      tables: [
        { name: 'users', count: users, description: 'Comptes utilisateurs & SuperAdmins' },
        { name: 'organizations', count: organizations, description: 'Tenants & Entreprises' },
        {
          name: 'memberships',
          count: memberships,
          description: 'Associations Membres-Organisations (RBAC)',
        },
        { name: 'projects', count: projects, description: 'Projets isolés par Row Level Security' },
        {
          name: 'jobs',
          count: jobs,
          description: 'Tâches asynchrones (Pending, Processing, Done)',
        },
        {
          name: 'outbox_events',
          count: outboxEvents,
          description: 'Événements Transactional Outbox (RabbitMQ)',
        },
        {
          name: 'audit_logs',
          count: auditLogs,
          description: "Piste d'audit immuable et traçabilité",
        },
        {
          name: 'refresh_sessions',
          count: refreshSessions,
          description: 'Sessions Refresh Tokens (Hachage SHA-256)',
        },
      ],
    };
  }

  async getTableRecords(table: string, limit = 50) {
    switch (table) {
      case 'users':
        return this.prisma.user.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
            isPlatformAdmin: true,
            createdAt: true,
          },
        });
      case 'organizations':
        return this.prisma.organization.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { memberships: true, projects: true, jobs: true } } },
        });
      case 'memberships':
        return this.prisma.membership.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: { select: { name: true, slug: true } },
            user: { select: { email: true, displayName: true } },
          },
        });
      case 'projects':
        return this.prisma.project.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: { select: { name: true, slug: true } },
            createdBy: { select: { email: true } },
          },
        });
      case 'jobs':
        return this.prisma.job.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: { select: { name: true } },
            requestedBy: { select: { email: true } },
          },
        });
      case 'outbox_events':
        return this.prisma.outboxEvent.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
      case 'audit_logs':
        return this.prisma.auditLog.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: { select: { name: true } },
            actorUser: { select: { email: true } },
          },
        });
      case 'refresh_sessions':
        return this.prisma.refreshSession.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: { id: true, userId: true, isRevoked: true, expiresAt: true, createdAt: true },
        });
      default:
        throw new NotFoundException(`Table '${table}' non supportée`);
    }
  }
}
