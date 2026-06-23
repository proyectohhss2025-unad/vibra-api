import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from '../../helpers/logger/logger.module';
import { AuthMiddleware } from '../../infrastructure/auth/auth.middleware';
import { EventsGateway } from '../../infrastructure/sockets/events.gateway';
import { FileUploadModule } from '../../infrastructure/file-upload/file-upload.module';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import {
  Participant,
  ParticipantSchema,
} from '../participant/schemas/participant.schema';
import { Config, ConfigSchema } from '../config/schemas/config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Config.name, schema: ConfigSchema },
    ]),
    LoggerModule,
    FileUploadModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, EventsGateway, JwtService],
  exports: [UsersService],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UsersController);
  }
}
