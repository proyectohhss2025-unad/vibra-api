import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { Test, TestSchema } from './schemas/test.schema';
import { PreTest, PreTestSchema } from '../preTest/schemas/preTest.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Test.name, schema: TestSchema },
      { name: PreTest.name, schema: PreTestSchema },
    ]),
  ],
  controllers: [TestController],
  providers: [TestService],
  exports: [TestService],
})
export class TestsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(TestController);
  }
}
