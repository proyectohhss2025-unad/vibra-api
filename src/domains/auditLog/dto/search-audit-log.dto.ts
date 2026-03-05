import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchAuditLogDto {
    @IsOptional()
    @IsString()
    user?: string;

    @IsOptional()
    @IsString()
    action?: string;

    @IsOptional()
    @IsString()
    entity?: string;

    @IsOptional()
    @IsString()
    details?: string;

    @IsOptional()
    @IsString()
    ip?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value ? String(value) : undefined)
    from?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value ? String(value) : undefined)
    to?: string;
}