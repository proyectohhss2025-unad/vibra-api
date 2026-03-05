import { Body, Controller, Post } from '@nestjs/common';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
    constructor(private readonly emailService: EmailService) { }

    @Post('send-email')
    async sendEmail(@Body() sendEmailDto: SendEmailDto) {
        await this.emailService.sendEmail(
            sendEmailDto.to,
            sendEmailDto.subject,
            sendEmailDto.html,
        );
        return { message: 'Correo enviado exitosamente' };
    }

    @Post('send-email-recovery-password')
    async sendEmailRecoveryPassword(@Body() sendEmailDto: SendEmailDto) {
        await this.emailService.sendEmailWithRecoveryPassword(
            sendEmailDto.to,
            sendEmailDto.html,
        );
        return { message: 'Correo enviado exitosamente' };
    }
}