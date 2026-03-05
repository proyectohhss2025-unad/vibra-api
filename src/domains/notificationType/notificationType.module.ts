import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { NotificationTypeController } from './notificationType.controller';
import { NotificationTypeService } from './notificationType.service';
import { NotificationType, NotificationTypeSchema } from './schemas/notificationType.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: NotificationType.name, schema: NotificationTypeSchema }]),
    ],
    controllers: [NotificationTypeController],
    providers: [NotificationTypeService],
    exports: [NotificationTypeService],
})
export class NotificationTypeModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(NotificationTypeController);
    }
}