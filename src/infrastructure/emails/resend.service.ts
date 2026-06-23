import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private resend: Resend | null = null;
  private configured = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey && apiKey !== 're_xxxxxxxxxxxx') {
      this.resend = new Resend(apiKey);
      this.configured = true;
      this.logger.log('ResendService inicializado correctamente');
    } else {
      this.logger.warn(
        'RESEND_API_KEY no configurada. Los correos de recuperación NO se enviarán.',
      );
    }
  }

  /**
   * Envía un correo de restablecimiento de contraseña (fire & forget).
   * No bloquea la respuesta del API. Los errores solo se loggean.
   */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    if (!this.configured || !this.resend) {
      this.logger.warn(
        `Resend no configurado. No se envió correo a ${email}. Token generado: ${token.substring(0, 20)}...`,
      );
      return;
    }

    const appUrl =
      this.configService.get<string>('VIBRA_APP_URL') ||
      'https://vibraunad.com.co';
    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'no-reply@vibraunad.com.co';
    const fromName =
      this.configService.get<string>('RESEND_FROM_NAME') || 'Vibra';

    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Fire & forget: no esperamos la respuesta para no bloquear al usuario
    this.resend.emails
      .send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: 'Recuperación de contraseña - Vibra',
        html: this.getResetEmailTemplate(resetUrl),
      })
      .then((result) => {
        this.logger.log(
          `Correo enviado exitosamente a ${email}: ${JSON.stringify(result)}`,
        );
      })
      .catch((err) => {
        this.logger.error(
          `Error al enviar correo a ${email}: ${err.message}`,
          err.stack,
        );
      });
  }

  private getResetEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #F3F4F6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 32px; text-align: center;">
                    <h1 style="color: #FFFFFF; font-size: 28px; margin: 0;">🔒 Vibra</h1>
                    <p style="color: #C7D2FE; font-size: 14px; margin: 8px 0 0 0;">Proyecto de educación emocional</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="color: #1F2937; font-size: 22px; margin: 0 0 16px 0;">Recuperación de contraseña</h2>
                    <p style="color: #6B7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Vibra</strong>.
                    </p>
                    <p style="color: #6B7280; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                      Haz clic en el siguiente botón para crear una nueva contraseña:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" 
                             style="display: inline-block; padding: 14px 40px; background: #4F46E5; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                            Restablecer contraseña
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 32px 0 0 0;">
                      Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, 
                      puedes ignorar este mensaje.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                      Vibra — Proyecto de educación emocional<br>
                      <a href="${resetUrl ? resetUrl.split('?')[0] : '#'}" style="color: #4F46E5; text-decoration: underline;">vibraunad.com.co</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
