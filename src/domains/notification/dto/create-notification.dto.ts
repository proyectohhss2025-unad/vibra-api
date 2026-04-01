import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  ID?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsNotEmpty()
  @IsString()
  user: string;

  @IsOptional()
  @IsString()
  participant?: string;

  @IsNotEmpty()
  @IsString()
  notificationType: string;

  @IsNotEmpty()
  @IsString()
  notificationChannel: string;

  @IsNotEmpty()
  @IsNumber()
  priority: number;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
