import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthMiddleware } from '../auth/auth.middleware';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
    imports: [ConfigModule],
    controllers: [EmailController],
    providers: [EmailService],
})
export class EmailModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(EmailController);
    }
}