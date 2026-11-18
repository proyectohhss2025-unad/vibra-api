import { Body, Controller, Delete, Get, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RequireAuthenticated } from 'src/infrastructure/auth/require-authenticated.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { RegisterTokenDto } from './dto/register-token.dto';
import { PushDeliveryStatsService } from './push-delivery-stats.service';
import { PushNotificationService } from './push-notifications.service';

@ApiTags('Push Notifications')
@ApiBearerAuth()
@Controller('api/push-notifications')
export class PushNotificationController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
    private readonly pushDeliveryStatsService: PushDeliveryStatsService,
  ) {}

  @RequireAuthenticated()
  @Get('vapid-public-key')
  @ApiOperation({
    summary: 'Obtener clave pública VAPID para Web Push',
    description:
      'Devuelve la clave pública VAPID que la PWA usa para crear la suscripción push. Null si no está configurada.',
  })
  @ApiOkResponse({
    description: 'Clave pública VAPID.',
    schema: {
      type: 'object',
      properties: {
        publicKey: { type: 'string', nullable: true },
      },
    },
  })
  getVapidPublicKey() {
    return { publicKey: this.pushNotificationService.getVapidPublicKey() };
  }

  @RequirePermission('P-EST-007')
  @Get('health')
  @ApiOperation({
    summary: 'Salud de tokens push',
    description:
      'Tokens activos/inactivos por plataforma, bajas de los últimos 7 días y últimas desactivaciones.',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Fuerza el recálculo ignorando la caché de 60s.',
    example: 'true',
  })
  @ApiOkResponse({
    description: 'Resumen de salud de los tokens push.',
    schema: {
      type: 'object',
      properties: {
        activeTokens: { type: 'number', example: 12 },
        inactiveTokens: { type: 'number', example: 3 },
        totalTokens: { type: 'number', example: 15 },
        deactivatedLast7Days: { type: 'number', example: 2 },
        platforms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              platform: { type: 'string', example: 'android' },
              active: { type: 'number', example: 8 },
              inactive: { type: 'number', example: 1 },
              total: { type: 'number', example: 9 },
            },
          },
        },
        recentDeactivations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              platform: { type: 'string', example: 'web' },
              reason: { type: 'string', example: 'expired_subscription' },
              at: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
            },
          },
        },
      },
    },
  })
  getHealth(@Query('refresh') refresh?: string) {
    return this.pushNotificationService.getDeliveryHealth(refresh === 'true');
  }

  @RequirePermission('P-EST-007')
  @Get('delivery-stats')
  @ApiOperation({
    summary: 'Histórico y tendencia de entregas push',
    description:
      'Tendencia semanal, resumen del periodo y última ejecución de envío push.',
  })
  @ApiQuery({
    name: 'weeks',
    required: false,
    description: 'Semanas a consultar (1-52, default 8).',
    example: '8',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Fuerza el recálculo ignorando la caché de 60s.',
    example: 'true',
  })
  @ApiOkResponse({
    description: 'Histórico de entregas push.',
    schema: {
      type: 'object',
      properties: {
        weeks: { type: 'number', example: 8 },
        summary: {
          type: 'object',
          properties: {
            sent: { type: 'number', example: 120 },
            failed: { type: 'number', example: 4 },
            deactivated: { type: 'number', example: 2 },
            skipped: { type: 'number', example: 0 },
            tokens: { type: 'number', example: 80 },
            users: { type: 'number', example: 20 },
            runs: { type: 'number', example: 8 },
            failureRate: { type: 'number', example: 3.2 },
            deactivationRate: { type: 'number', example: 1.6 },
          },
        },
        trend: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              weekStart: { type: 'string', format: 'date-time' },
              sent: { type: 'number', example: 15 },
              failed: { type: 'number', example: 1 },
              deactivated: { type: 'number', example: 1 },
              skipped: { type: 'number', example: 0 },
              tokens: { type: 'number', example: 10 },
              users: { type: 'number', example: 3 },
              runs: { type: 'number', example: 1 },
            },
          },
        },
        lastRun: {
          type: 'object',
          nullable: true,
          properties: {
            jobType: { type: 'string', example: 'CHECK_DAILY_COVERAGE' },
            event: { type: 'string', example: 'DAILY_COVERAGE:2026-11-02' },
            source: { type: 'string', example: 'job' },
            sent: { type: 'number', example: 3 },
            failed: { type: 'number', example: 0 },
            deactivated: { type: 'number', example: 0 },
            skipped: { type: 'number', example: 0 },
            tokens: { type: 'number', example: 3 },
            users: { type: 'number', example: 3 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  getDeliveryStats(
    @Query('weeks') weeks?: string,
    @Query('refresh') refresh?: string,
  ) {
    const parsed = Number(weeks);
    return this.pushDeliveryStatsService.getStats({
      weeks: Number.isFinite(parsed) && parsed > 0 ? parsed : 8,
      force: refresh === 'true',
    });
  }

  @RequireAuthenticated()
  @Post('register')
  @ApiOperation({
    summary: 'Registrar token push de dispositivo',
    description:
      'Registra o actualiza el Expo Push Token de un dispositivo asociado al usuario autenticado.',
  })
  @ApiBody({ type: RegisterTokenDto })
  @ApiCreatedResponse({
    description: 'Token registrado correctamente.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Token registrado correctamente' },
      },
    },
  })
  async register(
    @Req() req: Request,
    @Body() registerTokenDto: RegisterTokenDto,
  ) {
    const userId =
      (req as any).user?.sub ||
      (req as any).user?.userId ||
      (req as any).user?._id;
    return this.pushNotificationService.registerToken(userId, registerTokenDto);
  }

  @Delete('unregister')
  @ApiOperation({
    summary: 'Desactivar token push',
    description:
      'Desactiva un token push (útil cuando el usuario cierra sesión).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Token desactivado correctamente.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Token desactivado correctamente' },
      },
    },
  })
  async unregister(@Body('token') token: string) {
    return this.pushNotificationService.unregisterToken(token);
  }
}
