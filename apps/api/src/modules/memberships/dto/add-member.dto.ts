import { ApiProperty } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ example: 'colleague@atlascloud.io' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: MemberRole, example: MemberRole.MEMBER })
  @IsEnum(MemberRole)
  role!: MemberRole;
}
