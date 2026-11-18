import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { Model } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { SecurityService } from '../security/security.service';
import {
  CAPTCHA_FAILURE_WINDOW_MS,
  CAPTCHA_FLOW_REGISTER,
  CAPTCHA_INTERNAL_IPS,
  CAPTCHA_MAX_ATTEMPTS,
  CAPTCHA_MAX_FAILURES_PER_IP,
  CAPTCHA_MIN_AGE_MS,
  CAPTCHA_TTL_MS,
  CaptchaKind,
} from './captcha.constants';
import { captchaError } from './captcha.errors';
import { CaptchaChallengeResponseDto } from './dto/captcha-challenge-response.dto';
import { CaptchaChallenge } from './schemas/captcha-challenge.schema';

export interface VerifyCaptchaInput {
  challengeId?: string;
  answer?: string;
  ip?: string;
  flow?: string;
}

interface GeneratedChallenge {
  kind: CaptchaKind;
  prompt: string;
  answer: string;
}

interface IpFailureRecord {
  count: number;
  firstAt: number;
}

/**
 * Captcha propio de Vibra.
 *
 * Diseño:
 * - Reto aritmético legible y accesible (app móvil y web).
 * - Respuesta guardada solo como HMAC-SHA256 con secreto del servidor, de modo
 *   que una filtración de la colección no permita resolver retos offline.
 * - Un solo uso, expiración corta, máximo de intentos y edad mínima de
 *   resolución (heurística anti-bot).
 * - Fallos repetidos por IP ⇒ bloqueo automático vía SecurityService, el mismo
 *   mecanismo que usa el ThrottlerGuard.
 *
 * No se apoya en reCAPTCHA/Turnstile: mantiene los datos del estudiante dentro
 * de la infraestructura de Vibra y funciona igual en la app móvil.
 */
@Injectable()
export class CaptchaService {
  private readonly secret: string;
  private readonly failures = new Map<string, IpFailureRecord>();

  constructor(
    @InjectModel(CaptchaChallenge.name)
    private readonly challengeModel: Model<CaptchaChallenge>,
    private readonly configService: ConfigService,
    private readonly securityService: SecurityService,
    private readonly logger: AppLoggerService,
  ) {
    const configuredSecret =
      this.configService.get<string>('CAPTCHA_SECRET') ||
      this.configService.get<string>('JWT_SECRET');

    if (configuredSecret) {
      this.secret = configuredSecret;
    } else {
      // Sin secreto configurado los retos son válidos solo en esta instancia y
      // hasta el próximo reinicio. Se avisa para que no pase en producción.
      this.secret = randomBytes(32).toString('hex');
      this.logger.warn(
        '[captcha] CAPTCHA_SECRET/JWT_SECRET no configurado: usando secreto efímero. ' +
          'Define CAPTCHA_SECRET en producción (especialmente con varias instancias).',
      );
    }
  }

  /**
   * Emite un reto nuevo. Lanza 503 si no se puede persistir: en seguridad se
   * falla cerrado, no se deja pasar el registro sin verificación.
   */
  async issue(
    meta: { ip?: string; flow?: string } = {},
  ): Promise<CaptchaChallengeResponseDto> {
    const challengeId = randomUUID();
    const challenge = this.generateChallenge();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + CAPTCHA_TTL_MS);

    try {
      await this.challengeModel.create({
        challengeId,
        answerHash: this.hashAnswer(challengeId, challenge.answer),
        kind: challenge.kind,
        expiresAt,
        issuedAt,
        attempts: 0,
        consumedAt: null,
        flow: meta.flow ?? CAPTCHA_FLOW_REGISTER,
        ipHash: this.hashIp(meta.ip),
      });
    } catch (error: any) {
      this.logger.error(
        `[captcha] No se pudo emitir el reto: ${error?.message ?? error}`,
      );
      throw new ServiceUnavailableException(
        'No pudimos iniciar la verificación de seguridad. Intenta de nuevo en unos segundos.',
      );
    }

    return {
      challengeId,
      kind: challenge.kind,
      prompt: challenge.prompt,
      expiresIn: Math.floor(CAPTCHA_TTL_MS / 1000),
      issuedAt: issuedAt.toISOString(),
    };
  }

  /**
   * Verifica la respuesta de un reto. Consume el reto cuando es correcto.
   * Lanza BadRequestException con `code` estable en cualquier fallo.
   */
  async verifyOrThrow(input: VerifyCaptchaInput): Promise<void> {
    const challengeId = (input.challengeId ?? '').trim();
    const answer = this.normalizeAnswer(input.answer ?? '');

    if (!challengeId || !answer) {
      throw captchaError(
        'CAPTCHA_REQUIRED',
        'Completa la verificación de seguridad para continuar.',
      );
    }

    const challenge = await this.challengeModel
      .findOne({ challengeId })
      .select('+answerHash')
      .lean()
      .exec();

    if (!challenge) {
      throw captchaError(
        'CAPTCHA_INVALID',
        'La verificación de seguridad no es válida. Solicita una nueva.',
      );
    }

    if (challenge.flow && input.flow && challenge.flow !== input.flow) {
      this.recordFailure(input.ip, 'flow_mismatch');
      throw captchaError(
        'CAPTCHA_INVALID',
        'La verificación de seguridad no corresponde a este formulario.',
      );
    }

    if (challenge.consumedAt) {
      throw captchaError(
        'CAPTCHA_USED',
        'Esta verificación ya fue utilizada. Solicita una nueva.',
      );
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.burn(challengeId);
      throw captchaError(
        'CAPTCHA_EXPIRED',
        'La verificación de seguridad expiró. Solicita una nueva.',
      );
    }

    if (challenge.attempts >= CAPTCHA_MAX_ATTEMPTS) {
      await this.burn(challengeId);
      throw captchaError(
        'CAPTCHA_TOO_MANY_ATTEMPTS',
        'Agotaste los intentos de la verificación. Solicita una nueva.',
      );
    }

    // Un humano no lee la pregunta y responde en menos de un segundo.
    if (Date.now() - challenge.issuedAt.getTime() < CAPTCHA_MIN_AGE_MS) {
      await this.burn(challengeId);
      this.recordFailure(input.ip, 'too_fast');
      throw captchaError(
        'CAPTCHA_TOO_FAST',
        'La verificación se respondió demasiado rápido. Solicita una nueva.',
      );
    }

    const expectedHash = this.hashAnswer(challengeId, answer);
    if (!this.hashesMatch(expectedHash, challenge.answerHash)) {
      const attempts = challenge.attempts + 1;
      await this.challengeModel
        .updateOne({ challengeId }, { $inc: { attempts: 1 } })
        .exec();
      this.recordFailure(input.ip, 'wrong_answer');

      const remaining = CAPTCHA_MAX_ATTEMPTS - attempts;
      throw captchaError(
        'CAPTCHA_INVALID_ANSWER',
        remaining > 0
          ? `Respuesta incorrecta. Te quedan ${remaining} intento(s).`
          : 'Respuesta incorrecta. Solicita una nueva verificación.',
      );
    }

    // Consumo atómico: si dos peticiones compiten, solo una gana.
    const consumed = await this.challengeModel
      .findOneAndUpdate(
        { challengeId, consumedAt: null },
        { $set: { consumedAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!consumed) {
      throw captchaError(
        'CAPTCHA_USED',
        'Esta verificación ya fue utilizada. Solicita una nueva.',
      );
    }
  }

  // ─── Generación del reto ────────────────────────────────────────────────

  private generateChallenge(): GeneratedChallenge {
    const kind: CaptchaKind = (['sum', 'sub', 'mul'] as const)[randomInt(0, 3)];

    if (kind === 'sub') {
      const minuend = randomInt(6, 16);
      const subtrahend = randomInt(1, minuend);
      return {
        kind,
        answer: String(minuend - subtrahend),
        prompt: this.pickPrompt([
          `¿Cuánto es ${minuend} - ${subtrahend}?`,
          `Resta: ${minuend} - ${subtrahend}`,
          `${minuend} - ${subtrahend} = ?`,
          `Si tienes ${minuend} y quitas ${subtrahend}, ¿cuántos quedan?`,
        ]),
      };
    }

    if (kind === 'mul') {
      const a = randomInt(2, 10);
      const b = randomInt(2, 10);
      return {
        kind,
        answer: String(a * b),
        prompt: this.pickPrompt([
          `¿Cuánto es ${a} × ${b}?`,
          `Multiplica: ${a} × ${b}`,
          `${a} × ${b} = ?`,
        ]),
      };
    }

    const a = randomInt(2, 10);
    const b = randomInt(2, 10);
    return {
      kind: 'sum',
      answer: String(a + b),
      prompt: this.pickPrompt([
        `¿Cuánto es ${a} + ${b}?`,
        `Suma: ${a} + ${b}`,
        `${a} + ${b} = ?`,
        `Si tienes ${a} y agregas ${b}, ¿cuántos son?`,
      ]),
    };
  }

  private pickPrompt(options: string[]): string {
    return options[randomInt(0, options.length)];
  }

  // ─── Utilidades criptográficas ──────────────────────────────────────────

  private normalizeAnswer(answer: string): string {
    return String(answer ?? '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  private hashAnswer(challengeId: string, answer: string): string {
    return createHmac('sha256', this.secret)
      .update(`${challengeId}:${this.normalizeAnswer(answer)}`)
      .digest('hex');
  }

  private hashIp(ip?: string): string | undefined {
    if (!ip) return undefined;
    return createHmac('sha256', this.secret)
      .update(String(ip))
      .digest('hex')
      .slice(0, 32);
  }

  private hashesMatch(expected: string, stored: string): boolean {
    if (!expected || !stored) return false;
    const expectedBuffer = Buffer.from(expected, 'hex');
    const storedBuffer = Buffer.from(stored, 'hex');
    if (expectedBuffer.length !== storedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, storedBuffer);
  }

  private async burn(challengeId: string): Promise<void> {
    await this.challengeModel
      .updateOne(
        { challengeId, consumedAt: null },
        { $set: { consumedAt: new Date() } },
      )
      .exec();
  }

  // ─── Anti-abuso por IP ──────────────────────────────────────────────────

  /**
   * Cuenta fallos por IP en ventana móvil. Al superar el umbral se bloquea la
   * IP con el mecanismo existente de seguridad (fire & forget).
   */
  private recordFailure(ip: string | undefined, reason: string): void {
    if (!ip || CAPTCHA_INTERNAL_IPS.has(ip)) return;

    const now = Date.now();
    const current = this.failures.get(ip);

    if (!current || now - current.firstAt > CAPTCHA_FAILURE_WINDOW_MS) {
      this.failures.set(ip, { count: 1, firstAt: now });
      this.pruneFailures(now);
      return;
    }

    current.count += 1;
    this.logger.warn(
      `[captcha] Fallo de verificación (${reason}) desde ${ip}. Total en ventana: ${current.count}`,
    );

    if (current.count >= CAPTCHA_MAX_FAILURES_PER_IP) {
      this.failures.delete(ip);
      this.logger.warn(
        `[captcha] Bloqueando IP ${ip} por fallos repetidos de captcha.`,
      );
      this.securityService.blockIP(ip, current.count).catch((error: any) => {
        this.logger.error(
          `[captcha] No se pudo bloquear la IP ${ip}: ${error?.message ?? error}`,
        );
      });
    }
  }

  /** Evita que el mapa crezca sin límite en procesos de larga vida. */
  private pruneFailures(now: number): void {
    if (this.failures.size < 1000) return;
    for (const [ip, record] of this.failures) {
      if (now - record.firstAt > CAPTCHA_FAILURE_WINDOW_MS) {
        this.failures.delete(ip);
      }
    }
  }
}
