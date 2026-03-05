import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsString()
    documentNumber: string;

    @IsString()
    @IsOptional()
    typeDocument?: string;

    @IsEmail()
    email: string;

    @IsBoolean()
    @IsOptional()
    keepSessionActive?: boolean;

    @IsOptional()
    @IsString()
    role?: string;

    @IsOptional()
    @IsString()
    course?: string;

    @IsString()
    avatar: string;
}