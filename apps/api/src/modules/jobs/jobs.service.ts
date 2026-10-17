import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { CreateJobDto } from './dto/create-job.dto';
import { TenantTransactionService } from '../../database/tenant-transaction.service';

@Injectable()
export class JobsService {
  constructor(private readonly tenantTx: TenantTransactionService) {}

  async submitJob(organizationId: string, userId: string, dto: CreateJobDto) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      // 1. Idempotency Check
      if (dto.idempotencyKey) {
        const existingJob = await tx.job.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });
        if (existingJob) {
          return existingJob; // Idempotent return without duplicate side-effects
        }
      }

      // 2. Validate project if provided
      if (dto.projectId) {
        const project = await tx.project.findFirst({
          where: { id: dto.projectId, organizationId },
        });
        if (!project) {
          throw new NotFoundException('Specified project not found in organization');
        }
      }

      // 3. Create Job and Outbox Event atomically
      const job = await tx.job.create({
        data: {
          organizationId,
          projectId: dto.projectId ?? null,
          type: dto.type,
          status: 'PENDING',
          payload: dto.payload as Prisma.InputJsonValue,
          idempotencyKey: dto.idempotencyKey ?? null,
          requestedById: userId,
          attempts: 0,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventType: 'job.submitted',
          aggregateId: job.id,
          aggregateType: 'job',
          payload: {
            jobId: job.id,
            organizationId: job.organizationId,
            projectId: job.projectId,
            type: job.type,
            payload: job.payload,
            requestedById: job.requestedById,
          } as Prisma.InputJsonValue,
          status: 'PENDING',
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: 'JOB_SUBMITTED',
          resourceType: 'job',
          resourceId: job.id,
          metadata: { type: job.type, idempotencyKey: job.idempotencyKey },
        },
      });

      return job;
    });
  }

  async findAll(organizationId: string, limit = 20, offset = 0) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      const [items, total] = await Promise.all([
        tx.job.findMany({
          where: { organizationId },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        tx.job.count({ where: { organizationId } }),
      ]);

      return { items, total, limit, offset };
    });
  }

  async findOne(organizationId: string, jobId: string) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      const job = await tx.job.findFirst({
        where: { id: jobId, organizationId },
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      return job;
    });
  }

  async cancelJob(organizationId: string, jobId: string, userId: string) {
    return this.tenantTx.runWithTenant(organizationId, async (tx) => {
      const job = await tx.job.findFirst({
        where: { id: jobId, organizationId },
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== 'PENDING') {
        throw new BadRequestException(
          `Cannot cancel job with status '${job.status}'. Only PENDING jobs can be cancelled.`,
        );
      }

      const updated = await tx.job.update({
        where: { id: jobId },
        data: { status: 'CANCELLED' },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: 'JOB_CANCELLED',
          resourceType: 'job',
          resourceId: jobId,
        },
      });

      return updated;
    });
  }
}
