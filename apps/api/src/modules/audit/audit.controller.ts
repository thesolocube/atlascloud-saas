import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantRoleGuard } from '../../common/guards/tenant-role.guard';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@UseGuards(TenantRoleGuard)
@Controller({ path: 'organizations/:organizationId/audit-logs', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get organization audit logs (ADMIN/OWNER only)' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  async getAuditLogs(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getOrganizationAuditLogs(
      organizationId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }
}
