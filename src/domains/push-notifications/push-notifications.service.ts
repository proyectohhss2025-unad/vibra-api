import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { DeviceToken } from './schemas/device-token.schema';
import { RegisterTokenDto } from './dto/register-token.dto';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_CHUNK_SIZE = 100;

interface ExpoPushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class PushNotificationService {
  constructor(
    @InjectModel(DeviceToken.name)
    private deviceTokenModel: Model<DeviceToken>,
    private readonly logger: AppLoggerService,
  ) {}

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
        { token, userId, platform, isActive: true },
        { upsert: true, new: true },
      )
      .exec();

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
      .findOneAndUpdate({ token }, { isActive: false })
      .exec();

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
  ): Promise<{ success: boolean; sent: number }> {
    const tokens = await this.deviceTokenModel
      .find({ isActive: true })
      .lean()
      .exec();

    if (tokens.length === 0) {
      this.logger.log('No active push tokens found');
      return { success: true, sent: 0 };
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    let sent = 0;

    // Expo Push API acepta máximo 100 mensajes por request
    for (let i = 0; i < messages.length; i += MAX_CHUNK_SIZE) {
      const chunk = messages.slice(i, i + MAX_CHUNK_SIZE);
      try {
        const response = await fetch(EXPO_PUSH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          this.logger.error(`Expo Push API responded with ${response.status}`);
          continue;
        }

        const result = await response.json();
        sent += chunk.length;

        // Procesar errores individuales (tickets)
        if (result.data) {
          for (let j = 0; j < result.data.length; j++) {
            const ticket = result.data[j];
            if (ticket.status === 'error') {
              this.logger.error(
                `Push error for token ${chunk[j].to}: ${ticket.message}`,
              );
              // Si el token es inválido, desactivarlo
              if (
                ticket.message?.includes('DeviceNotRegistered') ||
                ticket.message?.includes('InvalidCredentials')
              ) {
                await this.deviceTokenModel
                  .findOneAndUpdate({ token: chunk[j].to }, { isActive: false })
                  .exec();
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error sending push notification chunk: ${error.message}`,
        );
      }
    }

    this.logger.log(`Push notifications sent: ${sent}/${tokens.length}`);
    return { success: true, sent };
  }
}
