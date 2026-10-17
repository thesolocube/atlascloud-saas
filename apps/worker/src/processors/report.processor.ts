import type { JobSubmittedMessage } from '@atlascloud/contracts';
import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a deterministic business report based on real project and job database records.
   * Produces actual persisted analytics without fake timers or mocked data.
   */
  async process(message: JobSubmittedMessage): Promise<void> {
    const { jobId, organizationId, projectId } = message;

    this.logger.log(`Starting real report generation for job: ${jobId} (org: ${organizationId})`);

    // Mark job as PROCESSING
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    try {
      const startTime = Date.now();

      // Retrieve real database stats for this organization and project
      const [organization, project, totalProjects, totalJobs, activeMembers] = await Promise.all([
        this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { id: true, name: true, slug: true, createdAt: true },
        }),
        projectId
          ? this.prisma.project.findUnique({
              where: { id: projectId },
              select: { id: true, name: true, status: true, createdAt: true },
            })
          : null,
        this.prisma.project.count({ where: { organizationId } }),
        this.prisma.job.count({ where: { organizationId } }),
        this.prisma.membership.count({ where: { organizationId } }),
      ]);

      const executionDurationMs = Date.now() - startTime;

      const reportResult = {
        summary: 'AtlasCloud Deterministic Project & Organization Report',
        generatedAt: new Date().toISOString(),
        organization: organization ?? { id: organizationId, name: 'Unknown' },
        targetProject: project ?? 'All Projects',
        metrics: {
          totalProjects,
          totalJobs,
          activeMembers,
        },
        executionMetrics: {
          processingDurationMs: executionDurationMs,
          engine: 'AtlasCloud Distributed Worker Node v1',
        },
      };

      // Persist real outcome in PostgreSQL
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: reportResult as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`Job ${jobId} successfully processed and marked COMPLETED`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      this.logger.error(`Job ${jobId} processing failed: ${errorMessage}`);

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          failureCode: 'REPORT_GENERATION_FAILED',
          failureMessage: errorMessage,
        },
      });
    }
  }
}
