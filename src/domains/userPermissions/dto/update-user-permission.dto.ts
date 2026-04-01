import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateUserPermissionDto {
  @ApiPropertyOptional({
    description: 'ID del usuario.',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  @IsOptional()
  @IsMongoId()
  user?: Types.ObjectId;

  @ApiPropertyOptional({
    description: 'ID del permiso.',
    example: '66c9cce47e6a95e98116c0ad',
  })
  @IsOptional()
  @IsMongoId()
  permission?: Types.ObjectId;

  @ApiPropertyOptional({
    description: 'Serial interno del registro.',
    example: 'UPERM-0001',
  })
  @IsOptional()
  @IsString()
  serial?: string;

  @ApiPropertyOptional({
    description: 'Estado activo/inactivo.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Usuario que edita el registro.',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  editedBy?: string;
}
