import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionTemplateDto {
  @ApiProperty({
    description: 'Nombre de la plantilla de permisos.',
    example: 'Administrador Vibra',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la plantilla.',
    example: 'Plantilla completa para administración del dashboard.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lista de ids de permisos asociados.',
    type: [String],
    example: ['66c9cce47e6a95e98116c0ad', '66c9cce47e6a95e98116c0ae'],
  })
  @IsOptional()
  @IsArray()
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Usuario que crea.',
    example: 'seed',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

