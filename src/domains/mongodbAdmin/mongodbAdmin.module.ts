import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'src/helpers/logger/logger.module';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { MongoDBAdminController } from './mongodbAdmin.controller';
import { MongoDBAdminService } from './mongodbAdmin.service';
import { MongoDBAdmin, MongoDBAdminSchema } from './schemas/mongodbAdmin.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: MongoDBAdmin.name, schema: MongoDBAdminSchema }]),
        LoggerModule,
    ],
    controllers: [MongoDBAdminController],
    providers: [MongoDBAdminService],
    exports: [MongoDBAdminService],
})
export class MongoDBAdminModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(MongoDBAdminController);
    }
}