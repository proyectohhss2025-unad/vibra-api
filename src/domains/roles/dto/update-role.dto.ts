import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateRoleDto } from './create-role.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para la actualización de un rol
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  /**
   * ID del rol a actualizar
   */
  @IsString()
  @ApiProperty({
    description: 'ID del rol a actualizar.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  _id: string;

  /**
   * Usuario que edita el rol
   */
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Usuario que edita el rol.',
    example: 'admin',
  })
  editedBy?: string;
}
