import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PreTestAnswerDto {
  @ApiProperty({ description: 'ID de la pregunta.', example: 'Q1' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Respuesta del usuario (texto u objeto simple).',
    example: 'Frecuentemente',
  })
  @IsNotEmpty()
  answer: any;

  @ApiProperty({
    description: 'Puntos asignados a la respuesta.',
    example: 3,
  })
  @IsNumber()
  points: number;
}

export class CreatePreTestDto {
  @ApiProperty({
    description: 'Identificador del pre-test.',
    example: 'PRETEST-BASELINE-EMOTIONS',
  })
  @IsString()
  @IsNotEmpty()
  testId: string;

  @ApiProperty({
    description:
      'Identificador del usuario (en Vibra se suele usar el documentNumber).',
    example: '6803296',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Respuestas del pre-test.',
    type: [PreTestAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreTestAnswerDto)
  responses: PreTestAnswerDto[];

  @ApiPropertyOptional({
    description:
      'Puntaje total. Si no se envía, el backend lo calcula a partir de responses.',
    example: 6,
  })
  @IsOptional()
  @IsNumber()
  totalScore?: number;
}
