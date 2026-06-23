import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'src/helpers/logger/logger.module';
import { BackupModule } from 'src/infrastructure/backup/backup.module';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { File, FileSchema } from '../files/schemas/file.schema';
import {
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
import { Report, ReportSchema } from '../reports/schemas/report.schema';
import { NotificationModule } from '../notification/notification.module';
import { IdeasModule } from '../ideas/ideas.module';
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
    BackupModule,
    IdeasModule,
    NotificationModule,
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
