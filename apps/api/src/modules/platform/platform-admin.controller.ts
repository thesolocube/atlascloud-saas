import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrganizationStatus } from '@prisma/client';

import { PlatformAdminService } from './platform-admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

export class UpdateOrgStatusDto {
  status!: OrganizationStatus;
}

@ApiTags('platform')
@ApiBearerAuth('access-token')
@Controller({ path: 'platform', version: '1' })
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide operational statistics' })
  async getStats() {
    return this.platformAdminService.getPlatformStats();
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List all platform organizations' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listOrgs(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.platformAdminService.listAllOrganizations(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Patch('organizations/:organizationId/status')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Suspend or reactivate an organization' })
  async updateOrgStatus(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: UpdateOrgStatusDto,
  ) {
    return this.platformAdminService.updateOrganizationStatus(
      organizationId,
      dto.status,
      adminUserId,
    );
  }

  @Get('jobs/failed')
  @ApiOperation({ summary: 'Inspect asynchronous job failures across all organizations' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listFailedJobs(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.platformAdminService.listFailedJobs(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('database/tables')
  @ApiOperation({ summary: 'List all database tables with total record counts' })
  async getDatabaseTables() {
    return this.platformAdminService.getDatabaseOverview();
  }

  @Get('database/table/:name')
  @ApiOperation({ summary: 'Retrieve records from a specific database table' })
  @ApiQuery({ name: 'limit', required: false })
  async getTableRecords(@Param('name') name: string, @Query('limit') limit?: string) {
    return this.platformAdminService.getTableRecords(name, limit ? parseInt(limit, 10) : 50);
  }
}
