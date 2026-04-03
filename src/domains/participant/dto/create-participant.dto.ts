import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ParticipantPreferencesDto {
  @ApiProperty({ description: 'Idioma preferido del participante.', example: 'Spanish' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({ description: 'Indica si tiene activadas las notificaciones.', example: true })
  @IsBoolean()
  notifications: boolean;
}

export class CreateParticipantDto {

  @ApiPropertyOptional({ description: 'ID del participante.', example: '65f1a2b3c4d5e6f7' })
  @IsString()
  @IsOptional()
  _id?: string;

  @ApiProperty({ description: 'ID del usuario asociado.', example: '65f1a2b3c4d5e6f7' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Nombre completo o institucional.', example: 'Institución Demo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Nombre de usuario o apodo del participante.', example: 'vibrandor_01' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ description: 'NIT del participante (si aplica).', example: '900123456-7' })
  @IsString()
  @IsNotEmpty()
  nit: string;

  @ApiPropertyOptional({ description: 'Puntos acumulados del participante.', example: 100 })
  @IsNumber()
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({
    description: 'Preferencias de la aplicación.',
    type: ParticipantPreferencesDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ParticipantPreferencesDto)
  preferences?: ParticipantPreferencesDto;

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

  @ApiPropertyOptional({ description: 'Indica si es particular.', example: false })
  @IsBoolean()
  @IsOptional()
  isParticular?: boolean;

  @ApiPropertyOptional({ description: 'Avatar del participante.', example: 'avatar.png' })
  @IsString()
  @IsOptional()
  avatar?: string;
}

