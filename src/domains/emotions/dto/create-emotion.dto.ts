import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
    description:
      'Nota de orientación o recomendación para la emoción (uso en el dashboard).',
    example: 'Respira y comparte algo positivo con tu grupo.',
  })
  @IsOptional()
  @IsString()
  orientationNote?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la emoción.',
    example: 'Estado emocional asociado a bienestar y motivación.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Nombre o ruta del ícono asociado a la emoción.',
    example: 'joy.png',
  })
  @IsString()
  @IsNotEmpty()
  icono: string;

  @ApiPropertyOptional({
    description:
      'Porcentaje o peso usado para visualización/indicadores en el dashboard.',
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  percentNote?: number;
}

