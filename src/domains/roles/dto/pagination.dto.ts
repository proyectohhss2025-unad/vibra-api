import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para los parámetros de paginación
 */
export class PaginationDto {
  /**
   * Número de página
   * @default 1
   * @example 1
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Número de página.',
    example: 1,
  })
  page?: number = 1;

  /**
   * Número de elementos por página
   * @default 10
   * @example 10
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Elementos por página.',
    example: 10,
  })
  limit?: number = 10;
}

/**
 * Interfaz para la respuesta paginada
 */
export interface PaginatedResponse<T> {
  /**
   * Datos paginados
   */
  items: T[];

  /**
   * Metadatos de paginación
   */
  meta: {
    /**
     * Número total de elementos
     */
    totalItems: number;

    /**
     * Número de elementos por página
     */
    itemsPerPage: number;

    /**
     * Página actual
     */
    currentPage: number;

    /**
     * Número total de páginas
     */
    totalPages: number;
  };
}
