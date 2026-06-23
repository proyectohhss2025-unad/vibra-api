import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TestQuestionDto {
  @ApiProperty({ description: 'ID de la pregunta.', example: 'q1' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Tipo de pregunta.',
    enum: ['open', 'single', 'multiple'],
    example: 'single',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Texto de la pregunta.',
    example: '¿Cómo te sientes hoy?',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    description: 'Opciones (solo para single/multiple).',
    example: ['Opción A', 'Opción B'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({
    description: 'Puntos de la pregunta.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({
    description: 'Si la pregunta es requerida.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateTestDto {
  @ApiProperty({
    description: 'Identificador único del test.',
    example: 'test-personalidad',
  })
  @IsString()
  @IsNotEmpty()
  testId: string;

  @ApiProperty({
    description: 'Título del test.',
    example: 'Test de Personalidad',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Descripción del test.',
    example: 'Test para evaluar...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Categoría del test.',
    example: 'Emociones',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Dificultad (1-5).',
    example: 2,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({
    description: 'Tiempo límite en minutos.',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimit?: number;

  @ApiPropertyOptional({
    description: 'Puntaje mínimo para aprobar (%).',
    example: 70,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({
    description: 'Si el test está activo.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Preguntas del test.',
    type: [TestQuestionDto],
    example: [
      {
        questionId: 'q1',
        type: 'open',
        text: '¿Te consideras una persona feliz?',
        points: 2,
      },
      {
        questionId: 'q2',
        type: 'single',
        text: '¿Cómo te sientes?',
        options: ['Bien', 'Mal'],
        points: 1,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => TestQuestionDto)
  questions: TestQuestionDto[];

  @ApiPropertyOptional({
    description: 'Etiquetas del test.',
    example: ['emociones', 'basico'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Mostrar al inicio de sesión (test inicial)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  showAtStart?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar al cerrar sesión (test final)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  showAtEnd?: boolean;

  @ApiPropertyOptional({ description: 'Creador del test.', example: 'admin' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
