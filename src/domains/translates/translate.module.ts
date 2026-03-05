import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateController } from './translate.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Translate, TranslateSchema } from './schemas/translate.schema';
import { LoggerModule } from '../logger';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';

@Module({
    imports: [MongooseModule.forFeature([{ name: Translate.name, schema: TranslateSchema }]),
        LoggerModule
    ],
    controllers: [TranslateController],
    providers: [TranslateService],
    exports: [TranslateService]
})
export class TranslateModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(TranslateController);
    }
}