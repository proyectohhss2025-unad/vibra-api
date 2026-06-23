import { Body, Controller, Delete, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RegisterTokenDto } from './dto/register-token.dto';
import { PushNotificationService } from './push-notifications.service';

@ApiTags('Push Notifications')
@ApiBearerAuth()
@Controller('api/push-notifications')
export class PushNotificationController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

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
    const userId = (req as any).user?.userId || (req as any).user?._id;
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
