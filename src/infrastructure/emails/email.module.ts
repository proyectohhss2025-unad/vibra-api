import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthMiddleware } from '../auth/auth.middleware';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ResendService } from './resend.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmailController],
  providers: [EmailService, ResendService],
  exports: [ResendService],
})
export class EmailModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(EmailController);
  }
}
