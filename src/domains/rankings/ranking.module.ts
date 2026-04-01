import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import {
  UserResponse,
  UserResponseSchema,
} from '../userResponses/schemas/userResponse.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { RankingService } from './ranking.service';
import { RankingGateway } from './socket/ranking.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserResponse.name, schema: UserResponseSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [RankingService, RankingGateway],
  exports: [RankingService],
})
export class RankingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(RankingGateway);
  }
}
