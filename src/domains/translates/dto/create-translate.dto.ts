import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateTranslateDto {
    @IsString()
    @IsNotEmpty()
    language: string;

    @IsObject()
    @IsNotEmpty()
    translations: Record<string, string>;
}