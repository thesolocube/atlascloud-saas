import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantRoleGuard } from '../../common/guards/tenant-role.guard';

@ApiTags('organizations')
@ApiBearerAuth('access-token')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization (caller becomes OWNER)' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations where caller is a member' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.orgsService.findAllForUser(userId);
  }

  @Get(':organizationId')
  @UseGuards(TenantRoleGuard)
  @Roles('VIEWER', 'MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get organization details' })
  async findOne(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.orgsService.findById(organizationId);
  }

  @Patch(':organizationId')
  @UseGuards(TenantRoleGuard)
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Update organization profile (requires ADMIN or OWNER)' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.update(organizationId, userId, dto);
  }
}
