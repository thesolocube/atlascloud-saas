import { ApiProperty } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: MemberRole, example: MemberRole.ADMIN })
  @IsEnum(MemberRole)
  role!: MemberRole;
}
