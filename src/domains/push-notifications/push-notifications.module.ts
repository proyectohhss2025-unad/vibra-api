import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { PushDeliveryStatsService } from './push-delivery-stats.service';
import { PushNotificationController } from './push-notifications.controller';
import { PushNotificationService } from './push-notifications.service';
import { DeviceToken, DeviceTokenSchema } from './schemas/device-token.schema';
import {
  PushDeliveryStat,
  PushDeliveryStatSchema,
} from './schemas/push-delivery-stat.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: PushDeliveryStat.name, schema: PushDeliveryStatSchema },
    ]),
  ],
  controllers: [PushNotificationController],
  providers: [PushNotificationService, PushDeliveryStatsService],
  exports: [PushNotificationService, PushDeliveryStatsService],
})
export class PushNotificationsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(PushNotificationController);
  }
}
