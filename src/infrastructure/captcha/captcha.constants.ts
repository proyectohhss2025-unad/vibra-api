/**
 * Parámetros del captcha propio de Vibra.
 *
 * El reto vive en MongoDB con índice TTL: al expirar, Mongo lo elimina.
 * Solo se guarda el HMAC de la respuesta, nunca la respuesta en claro.
 */
export const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutos
export const CAPTCHA_MAX_ATTEMPTS = 3;
export const CAPTCHA_MIN_AGE_MS = 1000; // respuesta < 1 s ⇒ bot
export const CAPTCHA_MAX_FAILURES_PER_IP = 5;
export const CAPTCHA_FAILURE_WINDOW_MS = 10 * 60 * 1000;

export const CAPTCHA_FLOW_REGISTER = 'register';
export const CAPTCHA_FLOW_REGISTER_DOCENTE = 'register-docente';

export const CAPTCHA_KINDS = ['sum', 'sub', 'mul'] as const;
export type CaptchaKind = (typeof CAPTCHA_KINDS)[number];

/** IPs que nunca se bloquean automáticamente (desarrollo/local). */
export const CAPTCHA_INTERNAL_IPS = new Set([
  '127.0.0.1',
  '::1',
  'localhost',
  'unknown',
]);
