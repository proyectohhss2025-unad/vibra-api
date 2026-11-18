import { Controller, Get, Header, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { CAPTCHA_FLOW_REGISTER } from './captcha.constants';
import { CaptchaService } from './captcha.service';
import { CaptchaChallengeResponseDto } from './dto/captcha-challenge-response.dto';
import { getClientIp } from './request-ip.util';

@Controller('api/captcha')
@ApiTags('Seguridad - Captcha')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Public()
  @Get('challenge')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Emitir un reto de captcha',
    description:
      'Devuelve una pregunta de verificación de un solo uso (5 minutos de vigencia). ' +
      'La respuesta nunca se envía al cliente: solo se compara en el servidor. ' +
      'El reto debe resolverse y enviarse en el registro mediante `captchaId` y `captchaAnswer`.',
  })
  @ApiOkResponse({
    description: 'Reto emitido.',
    type: CaptchaChallengeResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Demasiadas solicitudes de retos. Espera un momento.',
  })
  async challenge(@Req() request: any): Promise<CaptchaChallengeResponseDto> {
    return this.captchaService.issue({
      ip: getClientIp(request),
      flow: CAPTCHA_FLOW_REGISTER,
    });
  }
}
