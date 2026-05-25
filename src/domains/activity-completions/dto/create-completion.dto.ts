import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class GameCompletionDto {
  @ApiProperty({ enum: ['WordSearch', 'MatchingConcepts', 'DiceGame', 'EmotionBox'] })
  type: string;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  maxScore: number;
}

export class CreateCompletionDto {
  @ApiProperty({ description: 'ID del participante' })
  @IsMongoId()
  participant: string;

  @ApiProperty({ description: 'ID de la actividad' })
  @IsMongoId()
  activity: string;

  @ApiProperty({ example: 500, description: 'Puntaje máximo posible' })
  @IsNumber()
  @Min(0)
  plannedScore: number;

  @ApiProperty({ example: 420, description: 'Puntaje alcanzado' })
  @IsNumber()
  @Min(0)
  achievedScore: number;

  @ApiPropertyOptional({ example: 360, description: 'Tiempo total en segundos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ type: [GameCompletionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameCompletionDto)
  gamesCompleted?: GameCompletionDto[];
}
