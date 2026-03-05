import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateAuditLogDto } from './create-audit-log.dto';

export class UpdateAuditLogDto extends PartialType(CreateAuditLogDto) {
    @IsOptional()
    @IsString()
    editedBy?: string;
}