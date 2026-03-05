import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateNotificationChannelDto {
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