import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

/**
 * DTO for monthly notification statistics.
 * Contains aggregated data for notifications by category and month.
 */
export class MonthlyNotificationStatsDto {
  /**
   * The month name (abbreviated).
   * @example 'Ene'
   */
  @ApiProperty({
    description: 'The month name (abbreviated)',
    example: 'Ene',
    type: String,
  })
  @IsString()
  month: string;

  /**
   * The year of the statistics.
   * @example 2024
   */
  @ApiProperty({
    description: 'The year of the statistics',
    example: 2024,
    type: Number,
  })
  @IsNumber()
  year: number;

  /**
   * Number of catalog products notifications.
   * @example 15
   */
  @ApiProperty({
    description: 'Number of catalog products notifications',
    example: 15,
    type: Number,
  })
  @IsNumber()
  catalogo_productos: number;

  /**
   * Number of requests notifications.
   * @example 8
   */
  @ApiProperty({
    description: 'Number of requests notifications',
    example: 8,
    type: Number,
  })
  @IsNumber()
  solicitudes: number;

  /**
   * Number of users notifications.
   * @example 5
   */
  @ApiProperty({
    description: 'Number of users notifications',
    example: 5,
    type: Number,
  })
  @IsNumber()
  usuarios: number;

  /**
   * Number of reports notifications.
   * @example 3
   */
  @ApiProperty({
    description: 'Number of reports notifications',
    example: 3,
    type: Number,
  })
  @IsNumber()
  reportes: number;

  /**
   * Number of configuration notifications.
   * @example 2
   */
  @ApiProperty({
    description: 'Number of configuration notifications',
    example: 2,
    type: Number,
  })
  @IsNumber()
  configuracion: number;

  /**
   * Number of inventory notifications.
   * @example 4
   */
  @ApiProperty({
    description: 'Number of inventory notifications',
    example: 4,
    type: Number,
  })
  @IsNumber()
  inventarios: number;

  /**
   * Total number of notifications for the month.
   * @example 31
   */
  @ApiProperty({
    description: 'Total number of notifications for the month',
    example: 31,
    type: Number,
  })
  @IsNumber()
  total: number;
}