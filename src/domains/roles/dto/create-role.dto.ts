import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para la creación de un rol
 */
export class CreateRoleDto {
  /**
   * Nombre del rol
   * @example 'Administrador'
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nombre del rol.',
    example: 'Administrador',
  })
  name: string;

  /**
   * Descripción del rol
   * @example 'Rol con acceso a todas las funcionalidades'
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Descripción del rol.',
    example: 'Rol para administración del dashboard Vibra.',
  })
  description: string;

  /**
   * ID de la plantilla de permisos asociada al rol
   */
  @IsOptional()
  @ApiPropertyOptional({
    description: 'ID de la plantilla de permisos asociada al rol.',
    example: '66c9cce47e6a95e98116c0aa',
  })
  permissionTemplate?: Types.ObjectId;

  /**
   * Indica si el rol tiene permisos de superadministrador
   * @default false
   */
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Indica si el rol tiene permisos de superadministrador.',
    example: false,
  })
  isSuperAdmin?: boolean;

  /**
   * Usuario que crea el rol
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Usuario que crea el rol.',
    example: 'seed',
  })
  createdBy: string;
}
