import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get<string>('GMAIL_USER'),
                pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
            },
        });
    }

    async sendEmail(to: string, subject: string, html: string): Promise<void> {
        await this.transporter.sendMail({
            from: `"Mi App NestJS" <${this.configService.get('GMAIL_USER')}>`,
            to,
            subject,
            html,
        });
    }

    async sendEmailWithRecoveryPassword(to: string, html: string): Promise<void> {
        this.transporter.sendMail({
            from: `"Se ha enviado un nuevo correo desde: " <${this.configService.get('GMAIL_USER')}>`,
            to,
            subject: 'Se ha enviado un correo de recuperación de contraseña a su correo electrónico.',
            html: this.generateRandomPassword(10) ?? '',
        });
    }

    public generateRandomPassword(length: number) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+={}[\]|;:,<.>/?' +
            '`~'; // Include additional characters if needed

        let newPassword: string = '';
        for (let i = 0; i < length; i++) {
            newPassword += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        return newPassword || '';
    }
}