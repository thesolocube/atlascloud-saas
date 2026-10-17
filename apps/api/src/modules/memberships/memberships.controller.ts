import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MembershipsService } from './memberships.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantRoleGuard } from '../../common/guards/tenant-role.guard';

@ApiTags('members')
@ApiBearerAuth('access-token')
@UseGuards(TenantRoleGuard)
@Controller({ path: 'organizations/:organizationId/members', version: '1' })
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @Roles('VIEWER', 'MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'List members of the organization' })
  async listMembers(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.membershipsService.listMembers(organizationId);
  }

  @Post()
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Add a user to the organization' })
  async addMember(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.membershipsService.addMember(organizationId, actorUserId, dto);
  }

  @Patch(':membershipId')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Change a members role' })
  async updateRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membershipsService.updateMemberRole(organizationId, membershipId, actorUserId, dto);
  }

  @Delete(':membershipId')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  async removeMember(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.membershipsService.removeMember(organizationId, membershipId, actorUserId);
  }
}
