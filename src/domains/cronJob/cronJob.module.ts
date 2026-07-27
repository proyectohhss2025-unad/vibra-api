import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { BackupModule } from '../../infrastructure/backup/backup.module';
import { ActivitiesModule } from '../activities/activities.module';
import { RankingModule } from '../rankings/ranking.module';
import { NotificationModule } from '../notification/notification.module';
import { CronJobController } from './cronJob.controller';
import { CronJobService } from './cronJob.service';
import { CronJobExecutionService } from './cronJobExecution.service';
import { JobTypeRegistry } from './job-type-registry.service';
import { CronJob, CronJobSchema } from './schemas/cronJob.schema';
import {
  CronJobExecution,
  CronJobExecutionSchema,
} from './schemas/cronJobExecution.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CronJob.name, schema: CronJobSchema },
      { name: CronJobExecution.name, schema: CronJobExecutionSchema },
    ]),
    BackupModule,
    ActivitiesModule,
    RankingModule,
    NotificationModule,
  ],
  controllers: [CronJobController],
  providers: [
    CronJobService,
    CronJobExecutionService,
    JobTypeRegistry,
  ],
  exports: [CronJobService, JobTypeRegistry],
})
export class CronJobModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(CronJobController);
  }
}
