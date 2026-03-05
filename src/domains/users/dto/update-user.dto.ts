import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {

    @IsString()
    documentNumber: string;

    @IsString()
    @IsOptional()
    typeDocument?: string;

    @IsBoolean()
    @IsOptional()
    keepSessionActive?: boolean;

    @IsString()
    @IsOptional()
    role?: string;

    @IsString()
    @IsOptional()
    course?: string;

    @IsString()
    avatar: string;
}