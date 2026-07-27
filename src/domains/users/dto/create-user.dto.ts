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

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre de usuario único para iniciar sesión en Vibra.',
    example: 'maya',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description:
      'Contraseña del usuario (mín. 8 caracteres, mayúscula, minúscula, número y caracter especial).',
    example: 'Vibra@2026!',
  })
  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un caracter especial (@$!%*?&#',
    },
  )
  password: string;

  @ApiPropertyOptional({
    description: 'Nombre completo del usuario.',
    example: 'Maya',
  })
  @IsOptional()
  @IsString()
  name?: string;

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
  documentType?: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario.',
    example: 'maya@vibra.local',
  })
  @IsEmail()
  email: string;

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
    description:
      'Indica si el usuario desea mantener la sesión activa en el dashboard.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  keepSessionActive?: boolean;

  @ApiProperty({
    description: 'ID del rol asociado al usuario.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  @IsString()
  role: string;

  @ApiPropertyOptional({
    description: 'ID de la compañía/institución asociada al usuario.',
    example: '66c9cce47e6a95e98116c0ac',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description: 'Curso o grupo asignado al usuario (si aplica).',
    example: '10A',
  })
  @IsOptional()
  @IsString()
  course?: string;

  @ApiPropertyOptional({
    description: 'Nombre del avatar o URL del recurso del avatar.',
    example: 'default-user.png',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}
