import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../infrastructure/auth/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetService } from './password-reset.service';

@ApiTags('Recuperación de contraseña')
@Controller('api/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Public()
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Solicitar restablecimiento de contraseña',
    description:
      'Envía un correo con enlace de restablecimiento si el email existe. Siempre retorna el mismo mensaje por seguridad.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Respuesta genérica de confirmación',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Si el email existe, recibirás un enlace de restablecimiento',
        },
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Get('validate-token')
  @ApiOperation({
    summary: 'Validar token de restablecimiento',
    description:
      'Verifica si un token JWT de restablecimiento sigue vigente y no ha sido usado.',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Token JWT recibido por correo',
  })
  @ApiOkResponse({
    description: 'Resultado de validación',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        email: { type: 'string', example: 'usuario@ejemplo.com' },
      },
    },
  })
  async validateToken(@Query('token') token: string) {
    return this.passwordResetService.validateToken(token);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({
    summary: 'Restablecer contraseña con token',
    description:
      'Cambia la contraseña del usuario usando un token de restablecimiento válido.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    description: 'Contraseña actualizada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Contraseña actualizada exitosamente',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o expirado',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
