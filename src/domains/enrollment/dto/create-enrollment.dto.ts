import { IsString, IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnrollmentDto {
  @ApiProperty({
    description: 'ID del curso al que inscribir',
    example: '65f1a2b3c4d5e6f7g8h9i0j',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    description: 'Lista de IDs de estudiantes (User con role=Estudiante)',
    example: ['66a1b2c3d4e5f6g7h8i0j1', '66a1b2c3d4e5f6g7h8i0j2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  studentIds: string[];
}
