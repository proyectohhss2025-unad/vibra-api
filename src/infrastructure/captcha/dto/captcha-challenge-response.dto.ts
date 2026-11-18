import { ApiProperty } from '@nestjs/swagger';
import { CaptchaKind } from '../captcha.constants';

export class CaptchaChallengeResponseDto {
  @ApiProperty({
    description:
      'Identificador del reto. Debe enviarse junto con la respuesta en el registro.',
    example: '9f1c2f2e-6b7a-4d4e-9f0a-2b8c3d4e5f60',
  })
  challengeId: string;

  @ApiProperty({
    description: 'Tipo de operación del reto.',
    enum: ['sum', 'sub', 'mul'],
    example: 'sum',
  })
  kind: CaptchaKind;

  @ApiProperty({
    description:
      'Pregunta que debe responder la persona. Nunca contiene la respuesta.',
    example: '¿Cuánto es 7 + 5?',
  })
  prompt: string;

  @ApiProperty({
    description: 'Segundos de vigencia del reto antes de solicitar uno nuevo.',
    example: 300,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Momento de emisión del reto (ISO 8601).',
    example: '2026-10-25T15:04:05.000Z',
  })
  issuedAt: string;
}
