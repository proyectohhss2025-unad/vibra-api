import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AnswerDto {
  @ApiProperty({
    description: 'ID de la pregunta dentro de la actividad.',
    example: 'Q1',
  })
  @IsString()
  questionId: string;

  @ApiProperty({
    description: 'Respuesta dada por el usuario.',
    example: 'Feliz',
  })
  @IsString()
  answer: string;

  @ApiPropertyOptional({
    description: 'Tiempo de respuesta en segundos (si aplica).',
    example: 8,
  })
  @IsNumber()
  @IsOptional()
  responseTime?: number;
}

export class ActivityResponseDto {
  @ApiProperty({
    description: 'Listado de respuestas del usuario para la actividad.',
    type: [AnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
