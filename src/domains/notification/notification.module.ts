import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationType, NotificationTypeSchema } from '../notificationType/schemas/notificationType.schema';
import { NotificationChannel, NotificationChannelSchema } from '../notificationChannel/schemas/notificationChannel.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Notification.name, schema: NotificationSchema },
            { name: User.name, schema: UserSchema },
            { name: NotificationType.name, schema: NotificationTypeSchema },
            { name: NotificationChannel.name, schema: NotificationChannelSchema },
        ]),
    ],
    controllers: [NotificationController],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(NotificationController);
    }
}
