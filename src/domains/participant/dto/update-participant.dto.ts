import { IsOptional, IsString, IsEmail, IsNumber, IsBoolean, IsObject, ValidateNested, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ParticipantPreferencesUpdateDto {
  @ApiPropertyOptional({ description: 'Idioma preferido del participante.', example: 'Spanish' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Indica si tiene activadas las notificaciones.', example: true })
  @IsBoolean()
  @IsOptional()
  notifications?: boolean;
}

export class UpdateParticipantDto {
  @ApiProperty({ description: 'ID del participante a actualizar.', example: '66c9cce47e6a95e98116c0ab' })
  @IsString()
  @IsNotEmpty()
  _id: string;

  @ApiPropertyOptional({ description: 'ID del usuario asociado.', example: '65f1a2b3c4d5e6f7' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Nombre completo del participante.', example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Nickname del participante.', example: 'juan_p_01' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: 'NIT o documento del participante.', example: '123456789' })
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiPropertyOptional({ description: 'Puntos acumulados.', example: 100 })
  @IsNumber()
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({
    description: 'Preferencias de la aplicación.',
    type: ParticipantPreferencesUpdateDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ParticipantPreferencesUpdateDto)
  preferences?: ParticipantPreferencesUpdateDto;

  @ApiPropertyOptional({ description: 'Código EPS (si aplica).', example: 'EPS001' })
  @IsString()
  @IsOptional()
  epsCode?: string;

  @ApiPropertyOptional({ description: 'Dirección.', example: 'Calle 123 # 45-67' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Teléfono.', example: '3001234567' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Correo.', example: 'juan.perez@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Datos del responsable (si aplica).',
    example: {
      name: 'Responsable Legal',
      document: '987654321',
      documentType: 'CC',
      email: 'responsable@email.com',
      phoneNumber: '3101234567',
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

  @ApiPropertyOptional({ description: 'Indica si es particular.', example: true })
  @IsBoolean()
  @IsOptional()
  isParticular?: boolean;

  @ApiPropertyOptional({ description: 'Avatar del participante.', example: 'avatar.png' })
  @IsString()
  @IsOptional()
  avatar?: string;
}

