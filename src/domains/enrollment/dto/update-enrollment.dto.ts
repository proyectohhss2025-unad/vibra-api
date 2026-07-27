import { IsString, IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEnrollmentDto {
  @ApiProperty({
    description: 'Nuevo estado de la inscripción',
    enum: ['activo', 'completado', 'retirado'],
    example: 'completado',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['activo', 'completado', 'retirado'])
  status: string;
}
