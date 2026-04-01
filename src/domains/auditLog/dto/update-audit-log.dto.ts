import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateAuditLogDto } from './create-audit-log.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAuditLogDto extends PartialType(CreateAuditLogDto) {
  @ApiPropertyOptional({
    description: 'Usuario que edita el registro.',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  editedBy?: string;
}
