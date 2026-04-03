import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentTypeDto {
  @ApiProperty({ description: 'ID del tipo de documento.', example: '66c9cce47e6a95e98116c0ab' })
  @IsString()
  @IsNotEmpty()
  _id: string;

  @ApiPropertyOptional({ description: 'Nombre del tipo de documento.', example: 'CC' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción detallada.', example: 'Cédula de Ciudadanía' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Serial consecutivo.', example: '01' })
  @IsString()
  @IsOptional()
  serial?: string;

  @ApiPropertyOptional({ description: 'Indica si está activo.', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Usuario que edita el registro.', example: 'admin' })
  @IsString()
  @IsOptional()
  editedBy?: string;
}
