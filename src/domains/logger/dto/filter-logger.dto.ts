import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterLoggerDto {
  @ApiPropertyOptional({ description: 'Filtrar por método HTTP.', example: 'GET' })
  @IsString()
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({ description: 'Filtrar por URL (substring o exacta según implementación).', example: '/api/users' })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status HTTP.', example: 200 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({ description: 'Fecha/hora inicio (ISO).', example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Fecha/hora fin (ISO).', example: '2026-01-31T23:59:59.999Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Página.', example: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite por página.', example: 100 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 100;
}
