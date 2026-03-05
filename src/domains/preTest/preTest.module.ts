import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { PreTestController } from './preTest.controller';
import { PreTestService } from './preTest.service';
import { PreTest, PreTestSchema } from './schemas/preTest.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PreTest.name, schema: PreTestSchema }])],
  controllers: [PreTestController],
  providers: [PreTestService],
})
export class PreTestModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(PreTestController);
    }
}
