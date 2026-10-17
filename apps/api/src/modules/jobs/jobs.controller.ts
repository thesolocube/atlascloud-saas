import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantRoleGuard } from '../../common/guards/tenant-role.guard';

@ApiTags('jobs')
@ApiBearerAuth('access-token')
@UseGuards(TenantRoleGuard)
@Controller({ path: 'organizations/:organizationId/jobs', version: '1' })
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Submit an asynchronous job' })
  async submitJob(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.submitJob(organizationId, userId, dto);
  }

  @Get()
  @Roles('VIEWER', 'MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'List submitted jobs with pagination' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.jobsService.findAll(
      organizationId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':jobId')
  @Roles('VIEWER', 'MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get details, status and execution results for a job' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.jobsService.findOne(organizationId, jobId);
  }

  @Post(':jobId/cancel')
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Cancel a pending job' })
  async cancel(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.cancelJob(organizationId, jobId, userId);
  }
}
