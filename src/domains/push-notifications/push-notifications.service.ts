import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import webPush from 'web-push';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { DeviceToken } from './schemas/device-token.schema';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_CHUNK_SIZE = 100;
const WEB_PUSH_CONCURRENCY = 20;

interface ExpoPushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface PushSendResult {
  success: boolean;
  sent: number;
  failed: number;
  deactivated: number;
  skipped: number;
  tokens: number;
  users: number;
}

export interface PushHealthPlatform {
  platform: string;
  active: number;
  inactive: number;
  total: number;
}

export interface PushHealth {
  activeTokens: number;
  inactiveTokens: number;
  totalTokens: number;
  deactivatedLast7Days: number;
  platforms: PushHealthPlatform[];
  recentDeactivations: {
    platform: string;
    reason: string;
    at: Date | null;
  }[];
}

@Injectable()
export class PushNotificationService {
  private readonly vapidPublicKey: string | null;
  private readonly webPushReady: boolean;
  private healthCache: { data: PushHealth; at: number } | null = null;
  private readonly healthCacheMs = 60_000;

  constructor(
    @InjectModel(DeviceToken.name)
    private deviceTokenModel: Model<DeviceToken>,
    private readonly logger: AppLoggerService,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    const subject =
      process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@vibra.com';

    this.vapidPublicKey = publicKey || null;
    this.webPushReady = Boolean(publicKey && privateKey);

    if (this.webPushReady) {
      webPush.setVapidDetails(subject, publicKey!, privateKey!);
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas: Web Push deshabilitado',
      );
    }
  }

  /** Clave pública VAPID para que la PWA cree la suscripción. */
  getVapidPublicKey(): string | null {
    return this.vapidPublicKey;
  }

  /**
   * Registra o actualiza un token push de dispositivo
   */
  async registerToken(
    userId: string,
    dto: RegisterTokenDto,
  ): Promise<{ success: boolean; message: string }> {
    const { token, platform = 'android' } = dto;

    await this.deviceTokenModel
      .findOneAndUpdate(
        { token },
        {
          token,
          userId,
          platform,
          isActive: true,
          deactivatedAt: null,
          deactivationReason: null,
        },
        { upsert: true, new: true },
      )
      .exec();

    this.healthCache = null;
    this.logger.log(`Push token registered for user ${userId}`);
    return { success: true, message: 'Token registrado correctamente' };
  }

  /**
   * Desactiva un token push (logout)
   */
  async unregisterToken(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.deviceTokenModel
      .findOneAndUpdate(
        { token },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: 'user_unregistered',
          },
        },
      )
      .exec();

    this.healthCache = null;
    this.logger.log(`Push token unregistered: ${token}`);
    return { success: true, message: 'Token desactivado correctamente' };
  }

  /**
   * Envía una notificación push a todos los dispositivos registrados
   */
  async sendPushToAll(
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<PushSendResult> {
    const tokens = await this.deviceTokenModel
      .find({ isActive: true })
      .lean()
      .exec();

    return this.sendMessages(tokens, title, body, data);
  }

  /**
   * Envía una notificación push a los dispositivos de un usuario.
   */
  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<PushSendResult> {
    if (!userId) return this.emptyPushResult(0);

    const tokens = await this.deviceTokenModel
      .find({ userId, isActive: true })
      .lean()
      .exec();

    const result = await this.sendMessages(tokens, title, body, data);
    return { ...result, users: 1 };
  }

  /**
   * Envía una notificación push a los dispositivos de varios usuarios.
   * De-duplica ids y consulta solo tokens activos.
   */
  async sendPushToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<PushSendResult> {
    const ids = Array.from(
      new Set(
        (userIds || [])
          .map((id) => String(id))
          .filter((id) => id && id !== 'undefined' && id !== 'null'),
      ),
    );

    if (ids.length === 0) return this.emptyPushResult(0);

    const tokens = await this.deviceTokenModel
      .find({ userId: { $in: ids }, isActive: true })
      .lean()
      .exec();

    const result = await this.sendMessages(tokens, title, body, data);
    return { ...result, users: ids.length };
  }

  private emptyPushResult(users = 0): PushSendResult {
    return {
      success: true,
      sent: 0,
      failed: 0,
      deactivated: 0,
      skipped: 0,
      tokens: 0,
      users,
    };
  }

  /**
   * Separa tokens Expo de suscripciones Web Push, envía cada grupo y agrega
   * las métricas de entrega.
   */
  private async sendMessages(
    tokens: any[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<PushSendResult> {
    if (!tokens.length) {
      this.logger.log('No active push tokens found');
      return this.emptyPushResult(0);
    }

    const webTokens = tokens.filter((t) => t.platform === 'web');
    const expoTokens = tokens.filter((t) => t.platform !== 'web');

    const expo = await this.sendExpoMessages(expoTokens, title, body, data);
    const web = await this.sendWebMessages(webTokens, title, body, data);

    const uniqueUsers = new Set(
      tokens.map((t) => String(t.userId)).filter(Boolean),
    ).size;

    const result: PushSendResult = {
      success: true,
      sent: expo.sent + web.sent,
      failed: expo.failed + web.failed,
      deactivated: expo.deactivated + web.deactivated,
      skipped: web.skipped,
      tokens: tokens.length,
      users: uniqueUsers,
    };

    this.logger.log(
      `Push notifications sent: ${result.sent}/${result.tokens} ` +
        `(failed: ${result.failed}, deactivated: ${result.deactivated}, skipped: ${result.skipped})`,
    );
    return result;
  }

  /**
   * Envía mensajes Expo en chunks de 100 y desactiva tokens con errores
   * definitivos (DeviceNotRegistered / InvalidCredentials).
   */
  private async sendExpoMessages(
    tokens: any[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{ sent: number; failed: number; deactivated: number }> {
    const metrics = { sent: 0, failed: 0, deactivated: 0 };
    if (!tokens.length) return metrics;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    for (let i = 0; i < messages.length; i += MAX_CHUNK_SIZE) {
      const chunk = messages.slice(i, i + MAX_CHUNK_SIZE);
      try {
        const response = await fetch(EXPO_PUSH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          metrics.failed += chunk.length;
          this.logger.error(`Expo Push API responded with ${response.status}`);
          continue;
        }

        const result = await response.json();
        const tickets = Array.isArray(result?.data) ? result.data : [];

        if (tickets.length === 0) {
          // Sin tickets: la API aceptó el lote completo.
          metrics.sent += chunk.length;
          continue;
        }

        for (let j = 0; j < chunk.length; j++) {
          const ticket = tickets[j];
          if (!ticket || ticket.status !== 'error') {
            metrics.sent++;
            continue;
          }

          metrics.failed++;
          this.logger.error(
            `Push error for token ${chunk[j].to}: ${ticket.message}`,
          );

          if (
            ticket.message?.includes('DeviceNotRegistered') ||
            ticket.message?.includes('InvalidCredentials')
          ) {
            const reason = ticket.message.includes('DeviceNotRegistered')
              ? 'DeviceNotRegistered'
              : 'InvalidCredentials';
            await this.deactivateToken(chunk[j].to, reason);
            metrics.deactivated++;
          }
        }
      } catch (error) {
        metrics.failed += chunk.length;
        this.logger.error(
          `Error sending push notification chunk: ${error.message}`,
        );
      }
    }

    return metrics;
  }

  /**
   * Envía Web Push a las suscripciones de la PWA con concurrencia acotada.
   * Desactiva suscripciones expiradas (404/410) o inválidas.
   */
  private async sendWebMessages(
    tokens: any[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{
    sent: number;
    failed: number;
    deactivated: number;
    skipped: number;
  }> {
    const metrics = { sent: 0, failed: 0, deactivated: 0, skipped: 0 };
    if (!tokens.length) return metrics;

    if (!this.webPushReady) {
      this.logger.warn('Web Push omitido: VAPID no configurado');
      metrics.skipped = tokens.length;
      return metrics;
    }

    const payload = JSON.stringify({ title, body, data: data || {} });

    for (let i = 0; i < tokens.length; i += WEB_PUSH_CONCURRENCY) {
      const chunk = tokens.slice(i, i + WEB_PUSH_CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map(async (token) => {
          try {
            const subscription =
              typeof token.token === 'string'
                ? JSON.parse(token.token)
                : token.token;

            await webPush.sendNotification(subscription, payload, {
              TTL: 60 * 60 * 24,
            });
            return { ok: true, deactivated: false };
          } catch (error: any) {
            const expired =
              error?.statusCode === 404 || error?.statusCode === 410;
            const invalid = error instanceof SyntaxError;

            if (expired || invalid) {
              await this.deactivateToken(
                token.token,
                invalid ? 'invalid_subscription' : 'expired_subscription',
              );
            } else {
              this.logger.error(
                `Web push error: ${error?.message || error}`,
              );
            }

            return { ok: false, deactivated: expired || invalid };
          }
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.ok) {
            metrics.sent++;
          } else {
            metrics.failed++;
            if (result.value.deactivated) metrics.deactivated++;
          }
        } else {
          metrics.failed++;
        }
      }
    }

    return metrics;
  }

  /**
   * Desactiva un token de dispositivo y deja trazabilidad del motivo.
   */
  private async deactivateToken(token: string, reason: string): Promise<void> {
    await this.deviceTokenModel
      .findOneAndUpdate(
        { token },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: reason,
          },
        },
      )
      .exec();
    this.healthCache = null;
  }

  /**
   * Salud de los tokens push: activos/inactivos por plataforma, bajas de los
   * últimos 7 días y últimas desactivaciones. Cachea 60s para evitar escaneos
   * repetidos cuando varios administradores abren el dashboard.
   */
  async getDeliveryHealth(force = false): Promise<PushHealth> {
    if (
      !force &&
      this.healthCache &&
      Date.now() - this.healthCache.at < this.healthCacheMs
    ) {
      return this.healthCache.data;
    }

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    );

    const [facet] = await this.deviceTokenModel
      .aggregate([
        {
          $facet: {
            byPlatform: [
              {
                $group: {
                  _id: { platform: '$platform', isActive: '$isActive' },
                  count: { $sum: 1 },
                },
              },
            ],
            deactivatedLast7Days: [
              {
                $match: {
                  isActive: false,
                  deactivatedAt: { $gte: sevenDaysAgo },
                },
              },
              { $count: 'count' },
            ],
            recentDeactivations: [
              {
                $match: {
                  isActive: false,
                  deactivatedAt: { $ne: null },
                },
              },
              { $sort: { deactivatedAt: -1 } },
              { $limit: 5 },
              {
                $project: {
                  _id: 0,
                  platform: 1,
                  deactivationReason: 1,
                  deactivatedAt: 1,
                },
              },
            ],
          },
        },
      ])
      .exec();

    const platformMap = new Map<
      string,
      { active: number; inactive: number }
    >();

    for (const row of (facet?.byPlatform || []) as any[]) {
      const platform = row?._id?.platform || 'unknown';
      const entry = platformMap.get(platform) || { active: 0, inactive: 0 };
      if (row?._id?.isActive) entry.active += row.count || 0;
      else entry.inactive += row.count || 0;
      platformMap.set(platform, entry);
    }

    const fixedOrder = ['android', 'ios', 'web'];
    const extra = [...platformMap.keys()].filter(
      (platform) => !fixedOrder.includes(platform),
    );

    const platforms: PushHealthPlatform[] = [
      ...fixedOrder,
      ...extra,
    ].map((platform) => {
      const entry = platformMap.get(platform) || {
        active: 0,
        inactive: 0,
      };
      return {
        platform,
        active: entry.active,
        inactive: entry.inactive,
        total: entry.active + entry.inactive,
      };
    });

    const activeTokens = platforms.reduce(
      (sum, item) => sum + item.active,
      0,
    );
    const inactiveTokens = platforms.reduce(
      (sum, item) => sum + item.inactive,
      0,
    );

    const data: PushHealth = {
      activeTokens,
      inactiveTokens,
      totalTokens: activeTokens + inactiveTokens,
      deactivatedLast7Days:
        (facet?.deactivatedLast7Days?.[0]?.count as number) ?? 0,
      platforms,
      recentDeactivations: ((facet?.recentDeactivations || []) as any[]).map(
        (row) => ({
          platform: row.platform || 'unknown',
          reason: row.deactivationReason || 'unknown',
          at: row.deactivatedAt || null,
        }),
      ),
    };

    this.healthCache = { data, at: Date.now() };
    return data;
  }
}
