import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import { ResendService } from '../../infrastructure/emails/resend.service';
import { UsersService } from '../users/users.service';
import { PasswordResetToken } from './schemas/password-reset-token.schema';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly TOKEN_EXPIRY_HOURS = 1;

  constructor(
    @InjectModel(PasswordResetToken.name)
    private resetTokenModel: Model<PasswordResetToken>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private resendService: ResendService,
  ) {}

  /**
   * Solicita un restablecimiento de contraseña.
   * Siempre retorna el mismo mensaje genérico por seguridad.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage =
      'Si el email existe, recibirás un enlace de restablecimiento';

    try {
      const user = await this.usersService.findByOne({ email });
      if (!user) {
        this.logger.log(`Email ${email} no encontrado en BD (respuesta genérica)`);
        return { message: genericMessage };
      }

      this.logger.log(`Usuario encontrado: ${user.username} (${user._id})`);

      // Invalidar tokens previos activos del mismo email
      const invalidated = await this.resetTokenModel
        .updateMany(
          { email, usedAt: null, expiresAt: { $gt: new Date() } },
          { $set: { usedAt: new Date() } },
        )
        .exec();
      if (invalidated.modifiedCount > 0) {
        this.logger.log(`Tokens previos invalidados: ${invalidated.modifiedCount}`);
      }

      // Generar token JWT
      const payload = {
        sub: user._id.toString(),
        email: user.email,
        purpose: 'password-reset',
      };

      const rawToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: `${this.TOKEN_EXPIRY_HOURS}h`,
      });

      // Guardar hash del token en BD
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

      await this.resetTokenModel.create({
        email,
        userId: user._id,
        token: tokenHash,
        expiresAt,
        usedAt: null,
      });

      this.logger.log(`Token de reset creado para ${email} (expira: ${expiresAt.toISOString()})`);

      // Enviar email (fire & forget — no bloquea la respuesta)
      await this.sendResetEmail(email, rawToken);
    } catch (error) {
      this.logger.error(`Error en forgotPassword para ${email}: ${error.message}`, error.stack);
    }

    return { message: genericMessage };
  }

  /**
   * Valida si un token de restablecimiento sigue vigente.
   */
  async validateToken(token: string): Promise<{ valid: boolean; email?: string }> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.purpose !== 'password-reset') {
        return { valid: false };
      }

      const tokenHash = createHash('sha256').update(token).digest('hex');
      const stored = await this.resetTokenModel
        .findOne({
          token: tokenHash,
          usedAt: null,
          expiresAt: { $gt: new Date() },
        })
        .exec();

      if (!stored) {
        return { valid: false };
      }

      return { valid: true, email: stored.email };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Restablece la contraseña usando un token válido.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Validar token
    const validation = await this.validateToken(token);
    if (!validation.valid || !validation.email) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const stored = await this.resetTokenModel
      .findOne({
        token: tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!stored) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Actualizar usuario (usersService.update hashea la contraseña internamente)
    await this.usersService.update({
      _id: stored.userId.toString(),
      password: newPassword,
    } as any);

    // Marcar token como usado
    await this.resetTokenModel
      .updateOne({ _id: stored._id }, { $set: { usedAt: new Date() } })
      .exec();

    return { message: 'Contraseña actualizada exitosamente' };
  }

  /**
   * Envía el correo de restablecimiento vía Resend.
   */
  private async sendResetEmail(email: string, rawToken: string): Promise<void> {
    await this.resendService.sendPasswordReset(email, rawToken);
  }
}
