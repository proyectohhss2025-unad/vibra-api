import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { NotificationChannelController } from './notification-channel.controller';
import { NotificationChannelService } from './notification-channel.service';
import {
  NotificationChannel,
  NotificationChannelSchema,
} from './schemas/notificationChannel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationChannel.name, schema: NotificationChannelSchema },
    ]),
  ],
  controllers: [NotificationChannelController],
  providers: [NotificationChannelService],
})
export class NotificationChannelModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(NotificationChannelController);
  }
}
