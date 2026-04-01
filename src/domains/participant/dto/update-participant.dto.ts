import { IsOptional, IsString, IsEmail, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateParticipantDto {
  @ApiProperty({ description: 'ID del participante a actualizar.', example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiPropertyOptional({ description: 'Nombre del participante.', example: 'Institución Demo' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'NIT del participante.', example: '900123456-7' })
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiPropertyOptional({ description: 'Código EPS (si aplica).', example: 'EPS001' })
  @IsOptional()
  @IsString()
  epsCode?: string;

  @ApiPropertyOptional({ description: 'Dirección del participante.', example: 'Calle 123 # 45-67' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Teléfono del participante.', example: '3001234567' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Correo del participante.', example: 'contacto@institucion.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Límite de crédito (si aplica).', example: 0 })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'Datos del responsable del participante.',
    example: {
      name: 'Juan Pérez',
      document: '123456789',
      documentType: 'CC',
      email: 'juan.perez@institucion.local',
      phoneNumber: '3007654321',
    },
  })
  @IsOptional()
  managerData?: {
    name?: string;
    document?: string;
    documentType?: string;
    email?: string;
    phoneNumber?: string;
  };
}
