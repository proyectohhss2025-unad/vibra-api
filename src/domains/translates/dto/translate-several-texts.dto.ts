import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class TranslateSeveralTextsDto {
    @IsArray()
    @IsNotEmpty()
    texts: string[];

    @IsString()
    @IsNotEmpty()
    targetLanguage: string;
}