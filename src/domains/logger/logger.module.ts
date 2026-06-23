import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerController } from './logger.controller';
import { LoggerService } from './logger.service';
import { Logger, LoggerSchema } from './schemas/logger.schema';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { RequestLoggerMiddleware } from './logger.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Logger.name, schema: LoggerSchema }]),
  ],
  controllers: [LoggerController],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware de autenticación para el controlador de logs
    consumer.apply(AuthMiddleware).forRoutes(LoggerController);

    // Middleware de logging automático para TODAS las rutas /api/
    // Excluye las rutas del propio logger para evitar bucles infinitos
    consumer
      .apply(RequestLoggerMiddleware)
      .exclude(
        { path: 'api/logger/(.*)', method: RequestMethod.ALL },
        { path: 'api/admin/ideas-status', method: RequestMethod.GET },
      )
      .forRoutes({ path: '/api/*', method: RequestMethod.ALL });
  }
}
