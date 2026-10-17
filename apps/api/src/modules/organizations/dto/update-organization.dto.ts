import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Acme Global Inc' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
