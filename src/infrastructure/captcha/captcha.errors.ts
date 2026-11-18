import { BadRequestException } from '@nestjs/common';

/**
 * Códigos de error del captcha. El cliente (app móvil / web) los usa para
 * decidir si debe pedir un reto nuevo y para mostrar un mensaje accionable.
 */
export type CaptchaErrorCode =
  | 'CAPTCHA_REQUIRED'
  | 'CAPTCHA_INVALID'
  | 'CAPTCHA_EXPIRED'
  | 'CAPTCHA_USED'
  | 'CAPTCHA_TOO_MANY_ATTEMPTS'
  | 'CAPTCHA_TOO_FAST'
  | 'CAPTCHA_INVALID_ANSWER';

/**
 * Error de captcha con cuerpo estable: `{ statusCode, code, message }`.
 * NestJS añade `error: 'Bad Request'` automáticamente.
 */
export function captchaError(
  code: CaptchaErrorCode,
  message: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code,
    message,
  });
}
