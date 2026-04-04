import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

/**
 * DTO for notification type statistics.
 * Contains aggregated data for notifications by type with visual representation data.
 */
export class NotificationTypeStatsDto {
  /**
   * The name of the notification type.
   * @example 'Stock Bajo'
   */
  @ApiProperty({
    description: 'The name of the notification type',
    example: 'Participacion Baja',
    type: String,
  })
  @IsString()
  name: string;

  /**
   * The count/value for this notification type.
   * @example 25
   */
  @ApiProperty({
    description: 'The count/value for this notification type',
    example: 25,
    type: Number,
  })
  @IsNumber()
  value: number;

  /**
   * The color code for visual representation (hex format).
   * @example '#ef4444'
   */
  @ApiProperty({
    description: 'The color code for visual representation (hex format)',
    example: '#ef4444',
    type: String,
  })
  @IsString()
  color: string;
}