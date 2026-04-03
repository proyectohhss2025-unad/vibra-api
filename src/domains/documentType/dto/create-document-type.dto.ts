import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentTypeDto {
  @ApiProperty({ description: 'Nombre del tipo de documento.', example: 'CC' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Descripción detallada.', example: 'Cédula de Ciudadanía' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Serial consecutivo.', example: '01' })
  @IsString()
  @IsOptional()
  serial?: string;

  @ApiPropertyOptional({ description: 'Indica si está activo.', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Usuario que crea el registro.', example: 'seed' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
