import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterLoggerDto {
    @IsString()
    @IsOptional()
    method?: string;

    @IsString()
    @IsOptional()
    url?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    status?: number;

    @IsDateString()
    @IsOptional()
    startTime?: string;

    @IsDateString()
    @IsOptional()
    endTime?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limit?: number = 100;
}