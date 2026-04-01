import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre de usuario único para iniciar sesión en Vibra.',
    example: 'maya',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description:
      'Contraseña del usuario (se almacena con hash en base de datos).',
    example: 'Vibra@2026!',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description:
      'Número de documento del usuario (se usa como identificador en el dashboard).',
    example: '6803296',
  })
  @IsString()
  documentNumber: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento del usuario.',
    example: 'CC',
  })
  @IsString()
  @IsOptional()
  typeDocument?: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario.',
    example: 'maya@vibra.local',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description:
      'Indica si el usuario desea mantener la sesión activa en el dashboard.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  keepSessionActive?: boolean;

  @ApiPropertyOptional({
    description: 'ID del rol asociado al usuario.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Curso o grupo asignado al usuario (si aplica).',
    example: '10A',
  })
  @IsOptional()
  @IsString()
  course?: string;

  @ApiProperty({
    description: 'Nombre del avatar o URL del recurso del avatar.',
    example: 'default-user.png',
  })
  @IsString()
  avatar: string;
}
