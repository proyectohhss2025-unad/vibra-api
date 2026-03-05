import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateNotificationDto {
    @IsOptional()
    @IsBoolean()
    isRead?: boolean;

    @IsOptional()
    @IsString()
    editedBy?: string;
}