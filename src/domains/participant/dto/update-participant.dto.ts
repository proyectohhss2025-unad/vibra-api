import { IsOptional, IsString, IsNumber, IsBoolean, IsObject, ValidateNested, IsNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ParticipantPreferencesUpdateDto {
  @ApiPropertyOptional({ description: 'Idioma preferido del participante.', example: 'es' })
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
  @IsMongoId()
  @IsNotEmpty()
  _id: string;

  @ApiPropertyOptional({ description: 'Nickname del participante.', example: 'vibrandor_01' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: 'Avatar del participante.', example: 'https://...' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Puntos acumulados (asignación directa).', example: 150 })
  @IsNumber()
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({ description: 'Curso actual.', example: '65f1a2b3c4d5e6f7' })
  @IsMongoId()
  @IsOptional()
  currentCourse?: string;

  @ApiPropertyOptional({ description: 'Preferencias de la aplicación.', type: ParticipantPreferencesUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ParticipantPreferencesUpdateDto)
  preferences?: ParticipantPreferencesUpdateDto;

  @ApiPropertyOptional({ description: 'Indica si el participante está activo.', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePointsDto {
  @ApiProperty({ description: 'Puntos a incrementar (no absoluto).', example: 10 })
  @IsNumber()
  @IsNotEmpty()
  pointsIncrement: number;

  @ApiProperty({ description: 'Indica si completó una actividad.', example: true })
  @IsBoolean()
  activityCompleted: boolean;
}
