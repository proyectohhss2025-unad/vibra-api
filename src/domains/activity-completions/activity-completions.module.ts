import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityCompletionsController } from './activity-completions.controller';
import { ActivityCompletionsService } from './activity-completions.service';
import { ActivityCompletion, ActivityCompletionSchema } from './schemas/activity-completion.schema';
import { Participant, ParticipantSchema } from '../participant/schemas/participant.schema';
import { LoggerModule } from '../../helpers/logger/logger.module';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityCompletion.name, schema: ActivityCompletionSchema },
      { name: Participant.name, schema: ParticipantSchema },
    ]),
    LoggerModule,
  ],
  controllers: [ActivityCompletionsController],
  providers: [ActivityCompletionsService],
  exports: [ActivityCompletionsService],
})
export class ActivityCompletionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ActivityCompletionsController);
  }
}
