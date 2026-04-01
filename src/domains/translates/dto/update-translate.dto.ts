import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTranslateDto {
  @ApiPropertyOptional({ description: 'Código de idioma.', example: 'es' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({
    description: 'Diccionario de traducciones (key -> value).',
    example: { HELLO: 'Hola' },
  })
  @IsObject()
  @IsOptional()
  translations?: Record<string, string>;
}
