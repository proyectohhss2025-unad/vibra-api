import { ApiProperty } from '@nestjs/swagger';

export class ReleaseIpResponseDto {
  @ApiProperty({ description: 'IP liberada' })
  ip: string;

  @ApiProperty({ description: 'Indica si la liberación fue exitosa' })
  success: boolean;

  @ApiProperty({ description: 'Mensaje descriptivo' })
  message: string;
}
