import { Module } from '@nestjs/common';
import { ConfigModule as configMod } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { ActivitiesModule } from './domains/activities/activities.module';
import { AuditLogModule } from './domains/auditLog/audit-log.module';
import { AuthModule } from './domains/auth/auth.module';
import { CompanyModule } from './domains/company';
import { ConfigModule } from './domains/config/config.module';
import { CronJobModule } from './domains/cronJob/cronJob.module';
import { EmotionsModule } from './domains/emotions/emotions.module';
import { FeedbackModule } from './domains/feedback/feedback.module';
import { NotificationModule } from './domains/notification/notification.module';
import { ParticipantModule } from './domains/participant/participant.module';
import { PermissionTemplatesModule } from './domains/permissionTemplates/permissionTemplates.module';
import { PoliciesModule } from './domains/policies/policies.module';
import { PreTestModule } from './domains/preTest/preTest.module';
import { RankingModule } from './domains/rankings/ranking.module';
import { RolesModule } from './domains/roles/roles.module';
import { SchedulingModule } from './domains/scheduling/scheduling.module';
import { TranslateModule } from './domains/translates/translate.module';
import { UserPermissionsModule } from './domains/userPermissions/userPermissions.module';
import { UsersModule } from './domains/users/users.module';
import { LoggerModule } from './helpers/logger/logger.module';
import { EmailModule } from './infrastructure/emails/email.module';
import { ExceptionsModule } from './infrastructure/exceptions/exceptions.module';
import { FileUploadModule } from './infrastructure/file-upload/file-upload.module';
import { AppGateway } from './infrastructure/sockets/appGateway.gateway';
import { EventsGateway } from './infrastructure/sockets/events.gateway';
import { ThrottlerGuard } from './infrastructure/throttler/throttler.guard';
import { AppThrottlerModule } from './infrastructure/throttler/throttler.module';

@Module({
  imports: [
    configMod.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads', 'productos'),
      serveRoot: '/uploads/productos',
    }),
    AuditLogModule,
    CompanyModule,
    CronJobModule,
    ParticipantModule,
    FeedbackModule,
    NotificationModule,
    LoggerModule,
    AuthModule,
    UsersModule,
    EmotionsModule,
    RolesModule,
    FileUploadModule,
    EmailModule,
    PreTestModule,
    PoliciesModule,
    ActivitiesModule,
    RankingModule,
    SchedulingModule,
    AppThrottlerModule,
    ExceptionsModule,
    ConfigModule,
    CronJobModule,
    UserPermissionsModule,
    PermissionTemplatesModule,
    TranslateModule,
  ],
  providers: [
    EventsGateway,
    AppGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
