import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateConfigDto {
  @ApiProperty({ description: 'Nombre único de la configuración.', example: 'FEATURE_PRETEST' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la configuración.', example: 'Habilita el módulo de pretest.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Valor de la bandera (feature flag).', example: true })
  @IsBoolean()
  @IsNotEmpty()
  flag: boolean;

  @ApiPropertyOptional({
    description: 'Lista de usuarios permitidos (ids o usernames, según implementación).',
    example: ['admin', 'user.demo'],
  })
  @IsArray()
  @IsOptional()
  allowedUsers?: string[];

  @ApiPropertyOptional({
    description: 'Lista de usuarios no permitidos.',
    example: ['blocked.user'],
  })
  @IsArray()
  @IsOptional()
  disallowedUsers?: string[];

  @ApiPropertyOptional({ description: 'Usuario que crea.', example: 'seed' })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Usuario que edita.', example: 'admin' })
  @IsString()
  @IsOptional()
  editedBy?: string;
}
