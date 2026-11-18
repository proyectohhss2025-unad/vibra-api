import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Activity,
  ActivitySchema,
} from 'src/domains/activities/schemas/activity.schema';
import {
  Emotion,
  EmotionSchema,
} from 'src/domains/emotions/schemas/emotion.schema';
import {
  Enrollment,
  EnrollmentSchema,
} from 'src/domains/enrollment/schemas/enrollment.schema';
import {
  Participant,
  ParticipantSchema,
} from 'src/domains/participant/schemas/participant.schema';
import {
  UserResponse,
  UserResponseSchema,
} from 'src/domains/userResponses/schemas/userResponse.schema';
import { User, UserSchema } from 'src/domains/users/schemas/user.schema';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: UserResponse.name, schema: UserResponseSchema },
      { name: Emotion.name, schema: EmotionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: User.name, schema: UserSchema },
      // Filtro por curso: la pertenencia se resuelve por matrícula.
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ReportsController);
  }
}
