import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ enum: JobType, example: JobType.PROJECT_REPORT })
  @IsEnum(JobType)
  type!: JobType;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ example: { format: 'json', includeJobs: true } })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'idempotent-key-req-12345' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
