import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from '../../helpers/logger/logger.module';
import { AuthMiddleware } from '../../infrastructure/auth/auth.middleware';
import { FileUploadModule } from '../../infrastructure/file-upload/file-upload.module';
import { SocketsModule } from '../../infrastructure/sockets/sockets.module';
import { Config, ConfigSchema } from '../config/schemas/config.schema';
import {
  Participant,
  ParticipantSchema,
} from '../participant/schemas/participant.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

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
    SocketsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtService],
  exports: [UsersService],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UsersController);
  }
}
