import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from '../../helpers/logger/logger.module';
import { AuthMiddleware } from '../../infrastructure/auth/auth.middleware';
import { EventsGateway } from '../../infrastructure/sockets/events.gateway';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        LoggerModule
    ],
    controllers: [UsersController],
    providers: [UsersService, EventsGateway, JwtService],
    exports: [UsersService],
})
export class UsersModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(UsersController);
    }
}