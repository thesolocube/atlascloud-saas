import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantRoleGuard } from '../../common/guards/tenant-role.guard';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@UseGuards(TenantRoleGuard)
@Controller({ path: 'organizations/:organizationId/projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Create a project within an organization' })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(organizationId, userId, dto);
  }

  @Get()
  @Roles('VIEWER', 'MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'List projects in an organization with pagination' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.projectsService.findAll(
      organizationId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':projectId')
  @Roles('VIEWER', 'MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get a project by ID' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectsService.findOne(organizationId, projectId);
  }

  @Patch(':projectId')
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Update project details' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(organizationId, projectId, userId, dto);
  }

  @Delete(':projectId')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Delete a project' })
  async delete(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.delete(organizationId, projectId, userId);
  }
}
