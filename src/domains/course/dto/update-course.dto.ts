import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCourseDto {
  @ApiProperty({
    description: 'Nombre del curso',
    example: 'Matemáticas Avanzadas II',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Descripción del curso',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Fecha de inicio del curso',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    description: 'Fecha de fin del curso',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    description: 'Estado del curso',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @ApiProperty({
    description: 'ID del instructor principal',
    required: false,
  })
  @IsString()
  @IsOptional()
  instructorId?: string;

  @ApiProperty({
    description: 'Número máximo de estudiantes',
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxStudents?: number;

  @ApiProperty({
    description: 'Categoría del curso',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}