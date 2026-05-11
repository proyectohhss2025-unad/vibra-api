import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Nombre del curso',
    example: 'Matemáticas Avanzadas',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Descripción del curso',
    example: 'Curso de matemáticas para nivel universitario',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID de la compañía/institución',
    example: '681f1a2b3c4d5e6f7g8h9i0j',
  })
  @IsString()
  companyId: string;

  @ApiProperty({
    description: 'Fecha de inicio del curso',
    example: '2026-06-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    description: 'Fecha de fin del curso',
    example: '2026-12-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    description: 'Estado del curso (activo/inactivo)',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @ApiProperty({
    description: 'ID del instructor principal',
    example: '681f1a2b3c4d5e6f7g8h9i0k',
    required: false,
  })
  @IsString()
  @IsOptional()
  instructorId?: string;

  @ApiProperty({
    description: 'Número máximo de estudiantes',
    example: 30,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxStudents?: number;

  @ApiProperty({
    description: 'Categoría del curso',
    example: 'Matemáticas',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}