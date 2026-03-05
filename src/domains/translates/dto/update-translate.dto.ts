import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateTranslateDto {
    @IsString()
    @IsOptional()
    language?: string;

    @IsObject()
    @IsOptional()
    translations?: Record<string, string>;
}