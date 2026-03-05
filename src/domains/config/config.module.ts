import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { Config, ConfigSchema } from './schemas/config.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Config.name, schema: ConfigSchema }])],
    controllers: [ConfigController],
    providers: [ConfigService],
    exports: [ConfigService],
})
export class ConfigModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(ConfigController);
    }
}