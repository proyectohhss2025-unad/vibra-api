import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ParticipantPreferencesDto {
  @ApiProperty({
    description: 'Idioma preferido del participante.',
    example: 'es',
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({
    description: 'Indica si tiene activadas las notificaciones.',
    example: true,
  })
  @IsBoolean()
  notifications: boolean;
}

export class CreateParticipantDto {
  @ApiProperty({
    description: 'ID del usuario asociado (User).',
    example: '65f1a2b3c4d5e6f7',
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Nickname del participante.',
    example: 'vibrandor_01',
  })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiPropertyOptional({
    description: 'Avatar del participante.',
    example: 'https://...',
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Curso actual del participante.',
    example: '65f1a2b3c4d5e6f7',
  })
  @IsMongoId()
  @IsOptional()
  currentCourse?: string;

  @ApiPropertyOptional({
    description: 'Preferencias de la aplicación.',
    type: ParticipantPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ParticipantPreferencesDto)
  preferences?: ParticipantPreferencesDto;
}
