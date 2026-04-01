import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterTranslateDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por idioma.', example: 'es' })
  @IsString()
  @IsOptional()
  language?: string;
}
