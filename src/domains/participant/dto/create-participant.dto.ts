import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateParticipantDto {
  @ApiProperty({ description: 'Nombre del participante.', example: 'Institución Demo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'NIT del participante.', example: '900123456-7' })
  @IsString()
  @IsNotEmpty()
  nit: string;

  @ApiPropertyOptional({ description: 'Código EPS (si aplica).', example: 'EPS001' })
  @IsString()
  @IsOptional()
  epsCode?: string;

  @ApiPropertyOptional({ description: 'Dirección del participante.', example: 'Calle 123 # 45-67' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Teléfono del participante.', example: '3001234567' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Correo del participante.', example: 'contacto@institucion.local' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Usuario que crea el registro.', example: 'seed' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

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
    name: string;
    document: string;
    documentType: string;
    email: string;
    phoneNumber: string;
  };

  @ApiPropertyOptional({ description: 'Límite de crédito (si aplica).', example: 0 })
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Indica si es particular.', example: false })
  @IsBoolean()
  @IsOptional()
  isParticular?: boolean;
}
