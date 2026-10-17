import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationAuditLogs(organizationId: string, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { organizationId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: { id: true, email: true, displayName: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where: { organizationId } }),
    ]);

    return { items, total, limit, offset };
  }
}
