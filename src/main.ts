import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { AppLoggerService } from './helpers/logger/logger.service';
import { ThrottlerExceptionFilter } from './infrastructure/exceptions/throttler-exception.filter';

async function bootstrap() {
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
        // Add file transport for error logging
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ],
    }),
  });

  app.useGlobalPipes(new ValidationPipe())

  app.enableCors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Access-Token',
    exposedHeaders: 'Authorization',
    credentials: true,
  });

  const logger = new AppLoggerService();
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
      'JWT-auth'
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT || 4000, process.env.HOST);
  console.log(`Application API is running on http://${process.env.HOST}:${process.env.PORT}`);
}
bootstrap();
