import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RelapseEntryDto {
  @ApiProperty({ description: 'Fecha del bloqueo' })
  blockedAt: string;

  @ApiPropertyOptional({ description: 'Fecha de liberación', nullable: true })
  releasedAt: string | null;

  @ApiProperty({ description: 'Intentos registrados en ese ciclo' })
  attemptCount: number;
}

class IpMetadataDto {
  @ApiProperty({ description: 'Estado de la consulta' })
  status: string;

  @ApiProperty({ description: 'País' })
  country: string;

  @ApiProperty({ description: 'Código de país (ISO 3166-1 alpha-2)' })
  countryCode: string;

  @ApiProperty({ description: 'Región/Departamento' })
  region: string;

  @ApiProperty({ description: 'Ciudad' })
  city: string;

  @ApiProperty({ description: 'Código postal' })
  zip: string;

  @ApiProperty({ description: 'Latitud' })
  lat: number;

  @ApiProperty({ description: 'Longitud' })
  lon: number;

  @ApiProperty({ description: 'Zona horaria' })
  timezone: string;

  @ApiProperty({ description: 'ISP (Proveedor de internet)' })
  isp: string;

  @ApiProperty({ description: 'Organización' })
  org: string;

  @ApiProperty({ description: 'AS (Sistema autónomo)' })
  as: string;

  @ApiProperty({ description: 'IP consultada' })
  query: string;
}

export class BlockedIpResponseDto {
  @ApiProperty({ description: 'ID del documento' })
  id: string;

  @ApiProperty({ description: 'Dirección IP bloqueada' })
  ip: string;

  @ApiProperty({
    description: 'Número de intentos registrados antes del bloqueo',
  })
  attemptCount: number;

  @ApiProperty({ description: 'Fecha del bloqueo' })
  blockedAt: Date;

  @ApiPropertyOptional({ description: 'Fecha de liberación', nullable: true })
  releasedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Usuario admin que liberó la IP',
    nullable: true,
  })
  releasedBy: string | null;

  @ApiProperty({ description: 'Número de reincidencias' })
  relapseCount: number;

  @ApiProperty({ description: 'Origen del bloqueo: auto | manual' })
  blockedBy: string;

  @ApiProperty({
    description: 'Historial de reincidencias',
    type: [RelapseEntryDto],
  })
  relapseHistory: RelapseEntryDto[];

  @ApiPropertyOptional({
    description: 'Metadata de geolocalización/IP',
    type: IpMetadataDto,
    nullable: true,
  })
  metadata: IpMetadataDto | null;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última modificación' })
  updatedAt: Date;
}

export class BlockedIpListResponseDto {
  @ApiProperty({ description: 'Lista de IPs', type: [BlockedIpResponseDto] })
  data: BlockedIpResponseDto[];

  @ApiProperty({ description: 'Total de registros' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  pageSize: number;
}
