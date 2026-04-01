import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddPermissionToTemplateDto {
  @ApiProperty({
    description: 'ID del permiso a agregar a la plantilla.',
    example: '66c9cce47e6a95e98116c0ad',
  })
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({
    description: 'Usuario que edita la plantilla.',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  editedBy: string;
}

