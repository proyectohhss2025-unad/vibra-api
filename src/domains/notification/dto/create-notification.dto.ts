import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  ID?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiProperty({ description: 'ID del usuario receptor' })
  @IsNotEmpty()
  @IsString()
  user: string;

  @ApiPropertyOptional({ description: 'ID del participante (opcional)' })
  @IsOptional()
  @IsString()
  participant?: string;

  @ApiProperty({ description: 'ID del tipo de notificación' })
  @IsNotEmpty()
  @IsString()
  notificationType: string;

  @ApiProperty({ description: 'ID del canal de notificación' })
  @IsNotEmpty()
  @IsString()
  notificationChannel: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  priority: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Acción que el cliente puede ejecutar' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Etiqueta visible de la acción' })
  @IsOptional()
  @IsString()
  actionLabel?: string;

  @ApiPropertyOptional({ description: 'Metadatos de la acción' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
