import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateLoggerDto {
    @IsString()
    id: string;

    @IsString()
    method: string;

    @IsString()
    url: string;

    @IsNumber()
    @IsOptional()
    status?: number;

    @IsNumber()
    @IsOptional()
    responseTime?: number;

    @IsDateString()
    @IsOptional()
    timestamp?: string;

    @IsString()
    @IsOptional()
    ipAddress?: string;

    @IsString()
    @IsOptional()
    userAgent?: string;

    @IsString()
    @IsOptional()
    origin?: string;
}