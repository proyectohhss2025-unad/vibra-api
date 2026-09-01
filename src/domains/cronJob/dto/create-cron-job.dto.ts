import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCronJobDto {
  @ApiProperty({
    description: 'Nombre descriptivo del job.',
    example: 'Backup diario de BD',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Tipo de job (debe existir en el registro de tipos).',
    example: 'BACKUP_DB',
  })
  @IsString()
  jobType: string;

  @ApiPropertyOptional({
    description: 'Descripción del job.',
    example: 'Realiza un respaldo completo de la base de datos',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Expresión cron (5 campos).',
    example: '0 0 * * *',
  })
  @IsString()
  expression: string;

  @ApiPropertyOptional({
    description: 'Indica si el job inicia activo.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Configuración específica del tipo de job.',
    example: { backupDir: './backups', compress: true },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Reintentar en caso de fallo.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  retryOnFailure?: boolean;

  @ApiPropertyOptional({ description: 'Máximo de reintentos.', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Notificar en caso de error.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyOnError?: boolean;

  @ApiPropertyOptional({
    description: 'Notificar en caso de éxito.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyOnSuccess?: boolean;
}
