import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un caracter especial (@$!%*?&#)',
    },
  )
  password: string;

  @IsNotEmpty()
  @IsString()
  documentNumber: string;

  @IsOptional()
  @IsString()
  typeDocument?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
