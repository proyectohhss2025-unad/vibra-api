import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
    @IsNotEmpty()
    @IsString()
    user: string;

    @IsNotEmpty()
    @IsString()
    action: string;

    @IsNotEmpty()
    @IsString()
    entity: string;

    @IsOptional()
    @IsString()
    details?: string;

    @IsOptional()
    @IsString()
    ip?: string;
}