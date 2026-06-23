import { ApiProperty } from '@nestjs/swagger';

export class RankingItemDto {
  @ApiProperty({ description: 'Posición en el ranking', example: 1 })
  position: number;

  @ApiProperty({
    description: 'ID del participante',
    example: '66c9cce47e6a95e98116c0ab',
  })
  userId: string;

  @ApiProperty({ description: 'Apodo del participante', example: 'Maria G.' })
  nickname: string;

  @ApiProperty({ description: 'URL del avatar', required: false })
  avatar?: string;

  @ApiProperty({ description: 'Puntaje acumulado', example: 850 })
  points: number;

  @ApiProperty({
    description: 'Nivel (bronce, plata, oro, platino, diamante)',
    example: 'oro',
  })
  level: string;

  @ApiProperty({
    description: 'Nombre del curso',
    required: false,
    example: '10°A',
  })
  courseName?: string;

  @ApiProperty({
    description: 'Nombre de la institución',
    required: false,
    example: 'Colegio Jesús Nazareno',
  })
  institutionName?: string;
}

export class RankingResponseDto {
  @ApiProperty({ type: [RankingItemDto] })
  data: RankingItemDto[];

  @ApiProperty({
    description: 'Total de participantes en el ranking',
    example: 150,
  })
  total: number;

  @ApiProperty({ description: 'Escala del ranking', example: 'general' })
  scope: 'general' | 'course' | 'institution';

  @ApiProperty({
    description: 'ID de la entidad (curso/institución), null si es general',
    nullable: true,
  })
  scopeId: string | null;
}
