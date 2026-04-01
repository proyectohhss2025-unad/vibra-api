import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ResourceDto {
  @ApiProperty({
    description: 'Tipo de recurso asociado a la actividad.',
    example: 'video',
  })
  @IsEnum(['video', 'audio'])
  type: 'video' | 'audio';

  @ApiProperty({
    description: 'URL del recurso (video/audio).',
    example: 'https://cdn.vibra.com/resources/video-01.mp4',
  })
  @IsNotEmpty()
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Duración del recurso (segundos), si aplica.',
    example: 120,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales del recurso.',
    example: { provider: 'cdn', quality: '720p' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

class QuestionDto {
  @ApiProperty({
    description: 'Texto de la pregunta.',
    example: '¿Cómo te sientes hoy?',
  })
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @ApiProperty({
    description: 'Tipo de pregunta.',
    example: 'multiple',
  })
  @IsEnum(['multiple', 'open'])
  type: 'multiple' | 'open';

  @ApiPropertyOptional({
    description: 'Opciones para preguntas tipo multiple.',
    example: ['Feliz', 'Triste', 'Ansioso'],
  })
  @IsOptional()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({
    description: 'Respuesta correcta (si aplica para scoring automático).',
    example: 'Feliz',
  })
  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @ApiProperty({
    description: 'Puntos asignados a la pregunta.',
    example: 5,
  })
  @IsNumber()
  points: number;
}

export class CreateActivityDto {
  @ApiProperty({
    description:
      'ID de la emoción asociada (ObjectId de la colección emotions).',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @IsNotEmpty()
  @IsString()
  emotion: string;

  @ApiProperty({
    description: 'Título de la actividad.',
    example: 'Respiración consciente',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Descripción de la actividad.',
    example: 'Ejercicio breve para regular la emoción y enfocarte.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Recursos de la actividad (video/audio).',
    type: [ResourceDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources: ResourceDto[];

  @ApiProperty({
    description: 'Preguntas asociadas a la actividad.',
    type: [QuestionDto],
  })
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @ApiPropertyOptional({
    description: 'Dificultad (1-5).',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  difficulty?: number;
}

export class UpdateActivityDto extends CreateActivityDto {
  @ApiPropertyOptional({
    description: 'Permite activar/desactivar la actividad.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
