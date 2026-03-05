import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateNotificationChannelDto {
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