import { IsString, IsNumber, IsOptional } from 'class-validator';
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
    description:
      'Listado de respuestas del usuario. Array de {questionId, answer} para preguntas, u objeto de resultado para juegos (score, timeSpent, etc.).',
    type: [AnswerDto],
  })
  @IsOptional()
  answers?: AnswerDto[] | Record<string, any>;
}
