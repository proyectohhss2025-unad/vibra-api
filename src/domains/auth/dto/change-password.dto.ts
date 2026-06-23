import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'oldPassword123',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description:
      'Nueva contraseña (mín. 8 caracteres, mayúscula, minúscula, número y caracter especial)',
    example: 'Vibra@2026!',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un caracter especial (@$!%*?&#',
    },
  )
  newPassword: string;
}
