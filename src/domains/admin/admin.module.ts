import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'src/helpers/logger/logger.module';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { FileSchema } from '../files/schemas/file.schema';
import { NotificationSchema } from '../notification/schemas/notification.schema';
import { ReportSchema } from '../reports/schemas/report.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: File.name, schema: FileSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
    LoggerModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(AdminController);
  }
}
