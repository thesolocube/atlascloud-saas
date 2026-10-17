import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { TenantTransactionService } from '../../database/tenant-transaction.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly tenantTx: TenantTransactionService) {}

  async create(organizationId: string, userId: string, dto: CreateProjectDto) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId,
          name: dto.name,
          description: dto.description ?? null,
          createdById: userId,
          status: 'ACTIVE',
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: 'PROJECT_CREATED',
          resourceType: 'project',
          resourceId: project.id,
          metadata: { name: project.name },
        },
      });

      return project;
    });
  }

  async findAll(organizationId: string, limit = 20, offset = 0) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      const [items, total] = await Promise.all([
        tx.project.findMany({
          where: { organizationId },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, email: true, displayName: true },
            },
          },
        }),
        tx.project.count({ where: { organizationId } }),
      ]);

      return { items, total, limit, offset };
    });
  }

  async findOne(organizationId: string, projectId: string) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, organizationId },
        include: {
          createdBy: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found or not in organization');
      }

      return project;
    });
  }

  async update(organizationId: string, projectId: string, userId: string, dto: UpdateProjectDto) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      const existing = await tx.project.findFirst({
        where: { id: projectId, organizationId },
      });

      if (!existing) {
        throw new NotFoundException('Project not found');
      }

      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.status && { status: dto.status }),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: 'PROJECT_UPDATED',
          resourceType: 'project',
          resourceId: projectId,
          metadata: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async delete(organizationId: string, projectId: string, userId: string) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      const existing = await tx.project.findFirst({
        where: { id: projectId, organizationId },
      });

      if (!existing) {
        throw new NotFoundException('Project not found');
      }

      await tx.project.delete({
        where: { id: projectId },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: 'PROJECT_DELETED',
          resourceType: 'project',
          resourceId: projectId,
          metadata: { name: existing.name },
        },
      });

      return { message: 'Project deleted successfully' };
    });
  }
}
