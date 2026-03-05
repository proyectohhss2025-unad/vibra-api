import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'Correo electrónico del usuario',
        example: 'user@example.com',
        required: false
    })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({
        description: 'Nombre de usuario',
        example: 'user123',
        required: false
    })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({
        description: 'Contraseña del usuario',
        example: 'password123',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    password: string;
}