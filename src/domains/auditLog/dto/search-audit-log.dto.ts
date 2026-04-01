import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchAuditLogDto {
  @ApiPropertyOptional({
    description: 'Filtrar por usuario (id o username según implementación).',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({ description: 'Filtrar por acción.', example: 'CREATE' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filtrar por entidad.', example: 'User' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por texto en detalles.',
    example: 'Se creó',
  })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({ description: 'Filtrar por IP.', example: '127.0.0.1' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({
    description: 'Fecha/hora inicio (ISO string).',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value) : undefined))
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha/hora fin (ISO string).',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value) : undefined))
  to?: string;
}
