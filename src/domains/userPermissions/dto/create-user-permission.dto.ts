import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserPermissionDto {
  @ApiProperty({
    description: 'ID del usuario.',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiProperty({
    description: 'ID del permiso.',
    example: '66c9cce47e6a95e98116c0ad',
  })
  @IsString()
  @IsNotEmpty()
  permission: string;

  @ApiPropertyOptional({
    description: 'Serial interno del registro.',
    example: 'UPERM-0001',
  })
  @IsOptional()
  @IsString()
  serial?: string;

  @ApiPropertyOptional({
    description: 'Usuario que crea el registro.',
    example: 'seed',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

