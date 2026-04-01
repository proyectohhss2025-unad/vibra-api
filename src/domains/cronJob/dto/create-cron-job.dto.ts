import { IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCronJobDto {
  @ApiProperty({
    description: 'Expresión cron (5 campos).',
    example: '0 0 * * *',
  })
  @IsString()
  expression: string;

  @ApiProperty({
    description: 'Tipo de job (nombre lógico).',
    example: 'BACKUP_DB',
  })
  @IsString()
  jobType: string;

  @ApiProperty({
    description: 'Indica si el job está activo.',
    example: true,
  })
  @IsBoolean()
  active: boolean;
}
