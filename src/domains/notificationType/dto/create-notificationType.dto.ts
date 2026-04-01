import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateNotificationTypeDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  level?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
