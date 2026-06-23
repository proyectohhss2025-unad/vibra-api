import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import {
  Activity,
  ActivitySchema,
} from 'src/domains/activities/schemas/activity.schema';
import {
  UserResponse,
  UserResponseSchema,
} from 'src/domains/userResponses/schemas/userResponse.schema';
import {
  Emotion,
  EmotionSchema,
} from 'src/domains/emotions/schemas/emotion.schema';
import {
  Participant,
  ParticipantSchema,
} from 'src/domains/participant/schemas/participant.schema';
import { User, UserSchema } from 'src/domains/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: UserResponse.name, schema: UserResponseSchema },
      { name: Emotion.name, schema: EmotionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: User.name, schema: UserSchema },
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
