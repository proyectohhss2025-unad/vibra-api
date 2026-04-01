import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoggerDto {
  @ApiProperty({ description: 'ID único del log.', example: 'c0f8f7e9-8db6-4a63-a8e9-77d4f0c8a2f6' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Método HTTP.', example: 'GET' })
  @IsString()
  method: string;

  @ApiProperty({ description: 'URL solicitada.', example: '/api/users/all' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Código HTTP de respuesta.', example: 200 })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Tiempo de respuesta (ms).', example: 45 })
  @IsNumber()
  @IsOptional()
  responseTime?: number;

  @ApiPropertyOptional({ description: 'Timestamp ISO del evento.', example: '2026-04-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Dirección IP.', example: '127.0.0.1' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User-Agent del cliente.', example: 'Mozilla/5.0' })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Origen (header origin).', example: 'http://localhost:3000' })
  @IsString()
  @IsOptional()
  origin?: string;
}
