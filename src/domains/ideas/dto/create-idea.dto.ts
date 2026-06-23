import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateIdeaDto {
  @ApiProperty({ example: 'vibra-100', description: 'ID único de la idea' })
  @IsString()
  id: string;

  @ApiProperty({
    example: 'Implementar nueva funcionalidad X',
    description: 'Descripción de la idea',
  })
  @IsString()
  @MaxLength(500)
  descripcion: string;

  @ApiPropertyOptional({ example: '', description: 'Detalle extendido' })
  @IsOptional()
  @IsString()
  detalle?: string;

  @ApiPropertyOptional({
    example: ['feature', 'ux'],
    description: 'Tags de la idea',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ['alta', 'media', 'baja'], example: 'media' })
  @IsOptional()
  @IsEnum(['alta', 'media', 'baja'])
  prioridad?: string;

  @ApiPropertyOptional({
    enum: ['pendiente', 'en_desarrollo', 'desarrollada'],
    example: 'pendiente',
  })
  @IsOptional()
  @IsEnum(['pendiente', 'en_desarrollo', 'desarrollada'])
  estado?: string;
}

export class UpdateIdeaDto {
  @ApiPropertyOptional({ description: 'Descripción de la idea' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Detalle extendido' })
  @IsOptional()
  @IsString()
  detalle?: string;

  @ApiPropertyOptional({ description: 'Tags de la idea' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ['alta', 'media', 'baja'] })
  @IsOptional()
  @IsEnum(['alta', 'media', 'baja'])
  prioridad?: string;

  @ApiPropertyOptional({ enum: ['pendiente', 'en_desarrollo', 'desarrollada'] })
  @IsOptional()
  @IsEnum(['pendiente', 'en_desarrollo', 'desarrollada'])
  estado?: string;
}
