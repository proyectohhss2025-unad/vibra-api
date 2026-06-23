import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'ID del usuario a actualizar.',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  @IsString()
  @IsNotEmpty()
  _id: string;

  @ApiPropertyOptional({
    description: 'Nombre completo del usuario.',
    example: 'Maya',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Nombre de usuario único para iniciar sesión.',
    example: 'maya',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del usuario.',
    example: 'maya@vibra.local',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Número de documento del usuario.',
    example: '6803296',
  })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento del usuario.',
    example: 'CC',
  })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Dirección del usuario.',
    example: 'Calle 123 # 45-67',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono del usuario.',
    example: '3001234567',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description:
      'Nueva contraseña del usuario. Si no se envía, no se modifica. La validación de fortaleza se hace en la creación.',
    example: 'Vibra@2026!',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'ID del rol asociado al usuario.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'ID de la compañía/institución asociada al usuario.',
    example: '66c9cce47e6a95e98116c0ac',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description: 'Nombre del avatar o URL del recurso del avatar.',
    example: 'default-user.png',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Género del usuario.',
    example: 'MALE',
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento (ISO string).',
    example: '2000-01-01',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Indica si el usuario mantiene la sesión activa.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  keepSessionActive?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si el usuario está activo en el sistema.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
