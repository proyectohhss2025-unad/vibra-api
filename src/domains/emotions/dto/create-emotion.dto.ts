import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateEmotionDto {
  @ApiProperty({
    description: 'Identificador lógico único de la emoción.',
    example: 'EMO-001',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Nombre de la emoción.',
    example: 'Alegría',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Nota de orientación para la emoción.',
    example: 'Respira y comparte algo positivo con tu grupo.',
  })
  @IsOptional()
  @IsString()
  orientationNote?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la emoción.',
    example: 'Estado emocional asociado a bienestar.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Nombre o ruta del ícono de la emoción.',
    example: 'joy.png',
  })
  @IsString()
  @IsNotEmpty()
  icono: string;

  @ApiPropertyOptional({
    description: 'Porcentaje o peso para indicadores.',
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  percentNote?: number;

  @ApiPropertyOptional({
    description: 'Categoría de la emoción.',
    enum: ['Positiva', 'Negativa', 'Neutra', 'Basica', 'Compleja'],
    example: 'Positiva',
  })
  @IsOptional()
  @IsEnum(['Positiva', 'Negativa', 'Neutra', 'Basica', 'Compleja'])
  category?: string;

  @ApiPropertyOptional({
    description: 'Intensidad de la emoción (1-10).',
    example: 7,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  intensity?: number;
}

export class UpdateEmotionDto {
  @ApiPropertyOptional({ description: 'Nombre de la emoción.', example: 'Alegría' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Nota de orientación.', example: 'Respira y comparte algo positivo.' })
  @IsOptional()
  @IsString()
  orientationNote?: string;

  @ApiPropertyOptional({ description: 'Descripción.', example: 'Estado emocional asociado a bienestar.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Ícono.', example: 'joy.png' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  icono?: string;

  @ApiPropertyOptional({ description: 'Porcentaje.', example: 25 })
  @IsOptional()
  @IsNumber()
  percentNote?: number;

  @ApiPropertyOptional({ description: 'Categoría.', enum: ['Positiva', 'Negativa', 'Neutra', 'Basica', 'Compleja'], example: 'Positiva' })
  @IsOptional()
  @IsEnum(['Positiva', 'Negativa', 'Neutra', 'Basica', 'Compleja'])
  category?: string;

  @ApiPropertyOptional({ description: 'Intensidad (1-10).', example: 7 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  intensity?: number;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo.', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
