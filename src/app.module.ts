import { Module } from '@nestjs/common';
import { ConfigModule as configMod } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PermissionGuard } from './infrastructure/auth/permission.guard';
import * as path from 'path';
import { ActivitiesModule } from './domains/activities/activities.module';
import { ActivityCompletionsModule } from './domains/activity-completions/activity-completions.module';
import { AuditLogModule } from './domains/auditLog/audit-log.module';
import { AuthModule } from './domains/auth/auth.module';
import { CompanyModule } from './domains/company';
import { ConfigModule } from './domains/config/config.module';
import { CourseModule } from './domains/course/course.module';
import { CronJobModule } from './domains/cronJob/cronJob.module';
import { EmotionsModule } from './domains/emotions/emotions.module';
import { FeedbackModule } from './domains/feedback/feedback.module';
import { NotificationModule } from './domains/notification/notification.module';
import { ParticipantModule } from './domains/participant/participant.module';
import { PermissionTemplatesModule } from './domains/permissionTemplates/permissionTemplates.module';
import { PoliciesModule } from './domains/policies/policies.module';
import { PreTestModule } from './domains/preTest/preTest.module';
import { TestsModule } from './domains/tests/test.module';
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
import { PasswordResetModule } from './domains/password-reset/password-reset.module';
import { PermissionsModule } from './domains/permissions/permissions.module';
import { PermissionCategoryModule } from './domains/permissionCategory/permissionCategory.module';
import { DocumentTypeModule } from './domains/documentType/documentType.module';
import { PushNotificationsModule } from './domains/push-notifications/push-notifications.module';
import { ContactsModule } from './domains/contacts/contacts.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '24h' },
    }),
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
    FeedbackModule,
    NotificationModule,
    LoggerModule,
    AuthModule,
    UsersModule,
    ParticipantModule,
    EmotionsModule,
    EmailModule,
    ActivitiesModule,
    ActivityCompletionsModule,
    PreTestModule,
    TestsModule,
    PoliciesModule,
    RolesModule,
    UserPermissionsModule,
    PermissionTemplatesModule,
    PermissionsModule,
    PermissionCategoryModule,
    FileUploadModule,
    RankingModule,
    SchedulingModule,
    AppThrottlerModule,
    ExceptionsModule,
    ConfigModule,
    TranslateModule,
    DocumentTypeModule,
    CourseModule,
    PushNotificationsModule,
    PasswordResetModule,
    ContactsModule,
  ],
  providers: [
    EventsGateway,
    AppGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule { }
