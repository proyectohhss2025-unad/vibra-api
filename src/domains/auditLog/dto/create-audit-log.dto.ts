import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({
    description: 'Identificador del usuario que realizó la acción.',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  @IsNotEmpty()
  @IsString()
  user: string;

  @ApiProperty({
    description: 'Acción realizada.',
    example: 'CREATE',
  })
  @IsNotEmpty()
  @IsString()
  action: string;

  @ApiProperty({
    description: 'Entidad afectada.',
    example: 'User',
  })
  @IsNotEmpty()
  @IsString()
  entity: string;

  @ApiPropertyOptional({
    description: 'Detalles adicionales de la acción.',
    example: 'Se creó el usuario maya.',
  })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({
    description: 'Dirección IP desde la que se realizó la acción.',
    example: '127.0.0.1',
  })
  @IsOptional()
  @IsString()
  ip?: string;
}
