import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmotionsService } from './emotions.service';
import { EmotionsController } from './emotions.controller';
import { Emotion, EmotionSchema } from './schemas/emotion.schema';
import {
  Activity,
  ActivitySchema,
} from '../activities/schemas/activity.schema';
import {
  UserResponse,
  UserResponseSchema,
} from '../userResponses/schemas/userResponse.schema';
import { LoggerModule } from '../../helpers/logger/logger.module';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Emotion.name, schema: EmotionSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: UserResponse.name, schema: UserResponseSchema },
    ]),
    LoggerModule,
  ],
  controllers: [EmotionsController],
  providers: [EmotionsService],
  exports: [EmotionsService],
})
export class EmotionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(EmotionsController);
  }
}
