import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateNotificationTypeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  level?: number;

  @IsOptional()
  @IsString()
  editedBy?: string;
}
