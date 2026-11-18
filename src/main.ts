import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { AppLoggerService } from './helpers/logger/logger.service';
import { ThrottlerExceptionFilter } from './infrastructure/exceptions/throttler-exception.filter';
import { WsAdapter } from './infrastructure/sockets/ws-adapter';

async function bootstrap() {
  // Logger único del proceso (consola + `logs/error.log`). Se crea antes que
  // nada para que un fallo durante el arranque también quede registrado.
  const logger = new AppLoggerService();

  process.on('unhandledRejection', (reason: any) => {
    logger.error(
      `unhandledRejection: ${reason?.message ?? reason}`,
      reason?.stack,
    );

  });

  process.on('uncaughtException', (error: Error) => {
    logger.error(`uncaughtException: ${error?.message}`, error?.stack);

    setTimeout(() => process.exit(1), 300);
  });

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    }),
  });

  app.useGlobalPipes(new ValidationPipe());

  // Traza de errores 5xx con ruta y usuario del token. Se hace en middleware
  // (no en un filtro global `@Catch()`) para no desplazar al
  // ThrottlerExceptionFilter y conservar la respuesta 429 estructurada.
  app.use((req: any, res: any, next: () => void) => {
    res.on('finish', () => {
      if (res.statusCode >= 500) {
        logger.error(
          `HTTP ${res.statusCode} ${req.method} ${req.originalUrl} user=${req.user?.sub ?? 'anon'}`,
        );
      }
    });
    next();
  });

  app.useWebSocketAdapter(new WsAdapter(app));

  // `CORS_ORIGINS` es la whitelist explícita (obligatoria en producción). En
  // desarrollo se aceptan además los orígenes locales habituales (localhost,
  // 127.0.0.1 e IP de red privada, cualquier puerto) para que abrir la web en
  // `localhost:8081`, `127.0.0.1:8081` o la IP de LAN no derive en un
  // "Network Error" del navegador que en realidad es un bloqueo de CORS.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const isDevelopment = process.env.NODE_ENV !== 'production';

  const LOCAL_ORIGIN_PATTERN =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|(?:10|192\.168)\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{1,5})?$/;

  app.enableCors({
    origin: (origin, callback) => {
      // Sin `Origin` no es una petición de navegador (apps nativas, curl, health checks).
      const allowed =
        !origin ||
        corsOrigins.includes(origin) ||
        (isDevelopment && LOCAL_ORIGIN_PATTERN.test(origin));
      callback(null, allowed);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Access-Token',
    exposedHeaders: 'Authorization',
    credentials: true,
  });

  app.useLogger(logger);

  // Register the global exception filter for ThrottlerException
  app.useGlobalFilters(new ThrottlerExceptionFilter(logger));

  const config = new DocumentBuilder()
    .setTitle('Dashboard API')
    .setDescription('The Dashboard API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT || 4000, process.env.HOST);
  console.log(
    `Application API is running on http://${process.env.HOST}:${process.env.PORT}`,
  );
}
bootstrap();
