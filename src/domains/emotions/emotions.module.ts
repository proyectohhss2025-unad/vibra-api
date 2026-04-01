import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmotionsService } from './emotions.service';
import { EmotionsController } from './emotions.controller';
import { Emotion, EmotionSchema } from './schemas/emotion.schema';
import { LoggerModule } from '../../helpers/logger/logger.module';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Emotion.name, schema: EmotionSchema }]),
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
