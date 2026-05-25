import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import {
  UserResponse,
  UserResponseSchema,
} from '../userResponses/schemas/userResponse.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Participant, ParticipantSchema } from '../participant/schemas/participant.schema';
import { RankingService } from './ranking.service';
import { RankingsController } from './rankings.controller';
import { RankingsRestService } from './rankings-rest.service';
import { RankingGateway } from './socket/ranking.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserResponse.name, schema: UserResponseSchema },
      { name: User.name, schema: UserSchema },
      { name: Participant.name, schema: ParticipantSchema },
    ]),
  ],
  controllers: [RankingsController],
  providers: [RankingService, RankingsRestService, RankingGateway],
  exports: [RankingService, RankingsRestService],
})
export class RankingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // No aplicar AuthMiddleware a RankingsController (es público)
    consumer.apply(AuthMiddleware).exclude('api/rankings/(.*)').forRoutes(RankingGateway);
  }
}
