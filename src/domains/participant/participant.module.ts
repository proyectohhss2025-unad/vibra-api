import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import {
  WeeklySchedule,
  WeeklyScheduleSchema,
} from '../activities/schemas/weekly-schedule.schema';
import { ParticipantController } from './participant.controller';
import { ParticipantService } from './participant.service';
import { Participant, ParticipantSchema } from './schemas/participant.schema';
import { Company, CompanySchema } from '../company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participant.name, schema: ParticipantSchema },
      { name: WeeklySchedule.name, schema: WeeklyScheduleSchema },
      { name: Company.name, schema: CompanySchema },
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
