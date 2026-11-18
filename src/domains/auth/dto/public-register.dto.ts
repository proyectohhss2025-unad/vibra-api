import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RegisterDto } from './register.dto';

/**
 * Payload del registro público (app móvil).
 *
 * Extiende el registro base omitiendo `name` para exigirlo como obligatorio y
 * agrega los campos del captcha y el honeypot.
 */
export class PublicRegisterDto extends OmitType(RegisterDto, [
  'name',
] as const) {
  @ApiProperty({
    description: 'Nombre completo de la persona que se registra.',
    example: 'María Fernanda Gómez',
  })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    description:
      'Identificador del reto obtenido en GET /api/captcha/challenge.',
    example: '9f1c2f2e-6b7a-4d4e-9f0a-2b8c3d4e5f60',
  })
  @IsNotEmpty({
    message: 'Completa la verificación de seguridad para continuar.',
  })
  @IsString()
  @MaxLength(100)
  captchaId: string;

  @ApiProperty({
    description: 'Respuesta a la pregunta del reto de captcha.',
    example: '12',
  })
  @IsNotEmpty({
    message: 'Completa la verificación de seguridad para continuar.',
  })
  @IsString()
  @MaxLength(64)
  captchaAnswer: string;

  @ApiPropertyOptional({
    description:
      'Campo trampa (honeypot). Debe llegar siempre vacío; si trae contenido se descarta el registro como bot.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
