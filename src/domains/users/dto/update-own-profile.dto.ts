import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO para que un usuario autenticado actualice SU PROPIO perfil.
 *
 * Solo acepta campos personales. Deliberadamente NO incluye:
 * `role`, `isActive`, `company`, `documentNumber`, `username`, `email` ni
 * `password` — esos campos son de gestión administrativa o flujos dedicados
 * (evita escalada de privilegios desde el perfil).
 */
export class UpdateOwnProfileDto {
  @ApiPropertyOptional({ description: 'Nombre completo.', example: 'Maya' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Dirección de residencia.',
    example: 'Calle 123 # 45-67',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono (se guarda solo con dígitos).',
    example: '3001234567',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento (ISO string).',
    example: '2000-01-01',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Género.', example: 'MALE' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    description: 'Nombre del avatar o URL del recurso del avatar.',
    example: 'default-avatar.svg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}
