import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TranslationItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string;
}

class LanguageTranslationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({ type: () => [TranslationItemDto] })
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => TranslationItemDto)
  translations: Record<string, string>;
}

export class SeedTranslationsDto {
  @ApiProperty({ type: () => [LanguageTranslationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageTranslationDto)
  translations: LanguageTranslationDto[];
}
