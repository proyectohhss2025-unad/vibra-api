import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TranslateSeveralTextsDto {
  @ApiProperty({
    description: 'Lista de textos a traducir.',
    example: ['Hello', 'Goodbye'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  texts: string[];

  @ApiProperty({
    description: 'Idioma destino (ISO 639-1).',
    example: 'es',
  })
  @IsString()
  @IsNotEmpty()
  targetLanguage: string;
}
