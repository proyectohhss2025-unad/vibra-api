import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import {
  WeeklySchedule,
  WeeklyScheduleSchema,
} from '../activities/schemas/weekly-schedule.schema';
import {
  ActivityCompletion,
  ActivityCompletionSchema,
} from '../activity-completions/schemas/activity-completion.schema';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ParticipantController } from './participant.controller';
import { ParticipantService } from './participant.service';
import { Participant, ParticipantSchema } from './schemas/participant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participant.name, schema: ParticipantSchema },
      { name: WeeklySchedule.name, schema: WeeklyScheduleSchema },
      { name: Company.name, schema: CompanySchema },
      { name: ActivityCompletion.name, schema: ActivityCompletionSchema },
      // Nombre del estudiante para `/participants/me` (DEC-10).
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ParticipantController],
  providers: [ParticipantService],
  exports: [ParticipantService],
})
export class ParticipantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ParticipantController);
  }
}
