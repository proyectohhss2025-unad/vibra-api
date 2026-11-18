import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { LoginAttempt } from './schemas/login-attempt.schema';

export interface LoginLockStatus {
  locked: boolean;
  retryAfterSeconds: number;
}

export interface LoginRateStatus {
  blocked: boolean;
  retryAfterSeconds: number;
}

// IPs internas que no se limitan (desarrollo/local).
const INTERNAL_IPS = new Set(['127.0.0.1', '::1', 'localhost', 'unknown']);

/**
 * Protección de login por usuario.
 *
 * - Cuenta fallos consecutivos dentro de una ventana (`LOGIN_WINDOW_MINUTES`).
 * - Al superar `LOGIN_MAX_FAILURES` aplica un bloqueo temporal
 *   (`LOGIN_LOCK_MINUTES`).
 * - El bloqueo es "suave": el flujo de login sigue verificando la contraseña,
 *   de modo que la persona legítima nunca queda fuera de su cuenta por un
 *   ataque de bloqueo (DoS de cuentas). Solo se rechazan credenciales
 *   incorrectas mientras el bloqueo está activo.
 * - Se aplica también a usernames inexistentes, así que el bloqueo no revela
 *   si la cuenta existe.
 */
@Injectable()
export class LoginProtectionService {
  private readonly maxFailures: number;
  private readonly maxFailuresPerIp: number;
  private readonly windowMs: number;
  private readonly lockMs: number;

  /**
   * Fallos por IP en memoria (ventana móvil).
   *
   * Es una segunda barrera contra el "password spraying" desde una misma red y
   * evita que un atacante cree documentos ilimitados en `login_attempts`
   * probando usernames inexistentes. El bloqueo por cuenta sigue en MongoDB.
   */
  private readonly ipFailures = new Map<
    string,
    { count: number; firstAt: number }
  >();

  constructor(
    @InjectModel(LoginAttempt.name)
    private readonly loginAttemptModel: Model<LoginAttempt>,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.maxFailures = this.readPositiveInt('LOGIN_MAX_FAILURES', 5);
    this.maxFailuresPerIp = this.readPositiveInt(
      'LOGIN_MAX_FAILURES_PER_IP',
      40,
    );
    this.windowMs = this.readPositiveInt('LOGIN_WINDOW_MINUTES', 15) * 60_000;
    this.lockMs = this.readPositiveInt('LOGIN_LOCK_MINUTES', 15) * 60_000;
  }

  normalizeUsername(username: string): string {
    return String(username ?? '')
      .trim()
      .toLowerCase();
  }

  /**
   * Estado actual del bloqueo para un usuario.
   */
  async getLockStatus(username: string): Promise<LoginLockStatus> {
    const normalized = this.normalizeUsername(username);
    if (!normalized) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    const record = await this.loginAttemptModel
      .findOne({ username: normalized })
      .select('lockedUntil')
      .lean()
      .exec();

    return this.toStatus(record?.lockedUntil ?? null);
  }

  /**
   * Estado del límite por IP (segunda barrera anti password-spraying).
   */
  getIpStatus(ip?: string): LoginRateStatus {
    if (!ip || INTERNAL_IPS.has(ip)) {
      return { blocked: false, retryAfterSeconds: 0 };
    }

    const record = this.ipFailures.get(ip);
    if (!record) {
      return { blocked: false, retryAfterSeconds: 0 };
    }

    const elapsed = Date.now() - record.firstAt;
    if (elapsed > this.windowMs) {
      this.ipFailures.delete(ip);
      return { blocked: false, retryAfterSeconds: 0 };
    }

    if (record.count >= this.maxFailuresPerIp) {
      return {
        blocked: true,
        retryAfterSeconds: Math.ceil((this.windowMs - elapsed) / 1000),
      };
    }

    return { blocked: false, retryAfterSeconds: 0 };
  }

  /**
   * Registra un intento fallido y devuelve si la cuenta quedó bloqueada.
   * Si la ventana expiró, el contador arranca de nuevo.
   */
  async registerFailure(
    username: string,
    ip?: string,
    retried = false,
  ): Promise<LoginLockStatus> {
    const normalized = this.normalizeUsername(username);
    if (!normalized) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    this.recordIpFailure(ip);

    const now = new Date();
    const windowStart = new Date(now.getTime() - this.windowMs);
    const expiresAt = new Date(now.getTime() + this.windowMs + this.lockMs);

    try {
      // Ventana vencida → reiniciar contador antes de sumar el fallo actual.
      await this.loginAttemptModel
        .updateOne(
          {
            username: normalized,
            $or: [
              { firstFailureAt: null },
              { firstFailureAt: { $lt: windowStart } },
            ],
          },
          {
            $set: { failures: 0, firstFailureAt: now, lockedUntil: null },
          },
        )
        .exec();

      const record = await this.loginAttemptModel
        .findOneAndUpdate(
          { username: normalized },
          {
            $inc: { failures: 1 },
            $set: { lastFailureAt: now, expiresAt },
            $setOnInsert: { firstFailureAt: now },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .select('failures lockedUntil')
        .lean()
        .exec();

      if (!record) {
        return { locked: false, retryAfterSeconds: 0 };
      }

      const currentStatus = this.toStatus(record.lockedUntil, now);
      if (currentStatus.locked) {
        return currentStatus;
      }

      if (record.failures >= this.maxFailures) {
        const lockedUntil = new Date(now.getTime() + this.lockMs);
        await this.loginAttemptModel
          .updateOne(
            { username: normalized },
            {
              $set: {
                lockedUntil,
                expiresAt: new Date(lockedUntil.getTime() + this.windowMs),
              },
            },
          )
          .exec();

        this.logger.warn(
          `[login] Usuario "${normalized}" bloqueado ${Math.round(
            this.lockMs / 60_000,
          )} min tras ${record.failures} intentos fallidos.`,
        );

        return {
          locked: true,
          retryAfterSeconds: Math.ceil(this.lockMs / 1000),
        };
      }

      return { locked: false, retryAfterSeconds: 0 };
    } catch (error: any) {
      // Carrera en el upsert (dos primeras fallas simultáneas): reintentar una vez.
      if (error?.code === 11000 && !retried) {
        return this.registerFailure(normalized, ip, true);
      }

      // Un fallo de infraestructura no debe tumbar el login: se registra y se
      // continúa sin bloqueo (fail open en el contador, no en las credenciales).
      this.logger.error(
        `[login] No se pudo registrar el intento fallido de "${normalized}": ${
          error?.message ?? error
        }`,
      );
      return { locked: false, retryAfterSeconds: 0 };
    }
  }

  /**
   * Limpia el contador tras un login exitoso (o credenciales válidas).
   */
  async reset(username: string): Promise<void> {
    const normalized = this.normalizeUsername(username);
    if (!normalized) return;

    try {
      await this.loginAttemptModel.deleteOne({ username: normalized }).exec();
    } catch (error: any) {
      this.logger.error(
        `[login] No se pudo limpiar el contador de "${normalized}": ${
          error?.message ?? error
        }`,
      );
    }
  }

  // ─── Utilidades ─────────────────────────────────────────────────────────

  private recordIpFailure(ip?: string): void {
    if (!ip || INTERNAL_IPS.has(ip)) return;

    const now = Date.now();
    const record = this.ipFailures.get(ip);

    if (!record || now - record.firstAt > this.windowMs) {
      this.ipFailures.set(ip, { count: 1, firstAt: now });
      this.pruneIpFailures(now);
      return;
    }

    record.count += 1;

    if (record.count === this.maxFailuresPerIp) {
      this.logger.warn(
        `[login] IP ${ip} alcanzó ${record.count} fallos en la ventana; se limitan nuevos intentos.`,
      );
    }
  }

  /** Evita que el mapa crezca sin límite en procesos de larga vida. */
  private pruneIpFailures(now: number): void {
    if (this.ipFailures.size < 1000) return;

    for (const [ip, record] of this.ipFailures) {
      if (now - record.firstAt > this.windowMs) {
        this.ipFailures.delete(ip);
      }
    }
  }

  private toStatus(
    lockedUntil: Date | null,
    now: Date = new Date(),
  ): LoginLockStatus {
    if (!lockedUntil) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    const remainingMs = new Date(lockedUntil).getTime() - now.getTime();
    if (remainingMs <= 0) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    return {
      locked: true,
      retryAfterSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  private readPositiveInt(key: string, fallback: number): number {
    const raw = this.configService.get<string | number>(key);
    const parsed = Number.parseInt(String(raw ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
