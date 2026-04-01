import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { NotificationModule } from '../notification/notification.module';
import { CronJobController } from './cronJob.controller';
import { CronJobService } from './cronJob.service';
import { CronJob, CronJobSchema } from './schemas/cronJob.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CronJob.name, schema: CronJobSchema }]),
    NotificationModule,
  ],
  controllers: [CronJobController],
  providers: [CronJobService],
  exports: [CronJobService],
})
export class CronJobModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(CronJobController);
  }
}
