import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    readonly page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    readonly limit?: number;

    @IsOptional()
    readonly sortBy?: string;

    @IsOptional()
    readonly order?: 'asc' | 'desc';
}