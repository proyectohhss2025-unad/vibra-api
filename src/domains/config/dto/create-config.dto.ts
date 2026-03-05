import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConfigDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsNotEmpty()
    flag: boolean;

    @IsArray()
    @IsOptional()
    allowedUsers?: string[];

    @IsArray()
    @IsOptional()
    disallowedUsers?: string[];

    @IsString()
    @IsOptional()
    createdBy?: string;

    @IsString()
    @IsOptional()
    editedBy?: string;
}