import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTranslateDto {
  @ApiProperty({ description: 'Código de idioma.', example: 'es' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({
    description: 'Diccionario de traducciones (key -> value).',
    example: { HELLO: 'Hola', GOODBYE: 'Adiós' },
  })
  @IsObject()
  @IsNotEmpty()
  translations: Record<string, string>;
}
