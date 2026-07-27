import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCronJobDto {
  @ApiPropertyOptional({ description: 'Nombre descriptivo del job.' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción del job.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Expresión cron (5 campos).', example: '0 0 * * *' })
  @IsOptional()
  @IsString()
  expression?: string;

  @ApiPropertyOptional({ description: 'Indica si el job está activo.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Configuración específica del tipo de job.' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Reintentar en caso de fallo.' })
  @IsOptional()
  @IsBoolean()
  retryOnFailure?: boolean;

  @ApiPropertyOptional({ description: 'Máximo de reintentos.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Notificar en caso de error.' })
  @IsOptional()
  @IsBoolean()
  notifyOnError?: boolean;

  @ApiPropertyOptional({ description: 'Notificar en caso de éxito.' })
  @IsOptional()
  @IsBoolean()
  notifyOnSuccess?: boolean;
}
