import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerController } from './logger.controller';
import { LoggerService } from './logger.service';
import { Logger, LoggerSchema } from './schemas/logger.schema';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';

@Module({
    imports: [MongooseModule.forFeature([{ name: Logger.name, schema: LoggerSchema }])],
    controllers: [LoggerController],
    providers: [LoggerService],
    exports: [LoggerService],
})
export class LoggerModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(LoggerController);
    }
}