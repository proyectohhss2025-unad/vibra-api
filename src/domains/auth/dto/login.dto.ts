import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Nombre de usuario',
    example: 'user123',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  username: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  password: string;
}
