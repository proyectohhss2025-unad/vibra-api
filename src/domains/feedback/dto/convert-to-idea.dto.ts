import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConvertToIdeaDto {
  @ApiPropertyOptional({
    description: 'Título refinado de la idea (default: feedback.title)',
    example: 'Mejorar dashboard mobile',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada de la idea (default: feedback.description)',
    example: 'Los usuarios reportan que el dashboard en mobile es lento al cargar las gráficas.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ['alta', 'media', 'baja'],
    default: 'media',
    description: 'Prioridad de la idea',
  })
  @IsOptional()
  @IsIn(['alta', 'media', 'baja'])
  priority?: string;

  @ApiPropertyOptional({
    description: 'Tags para categorizar la idea',
    example: ['feedback', 'mobile', 'ux'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
