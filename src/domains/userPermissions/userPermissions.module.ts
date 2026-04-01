import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import {
  UserPermission,
  UserPermissionSchema,
} from './schemas/userPermission.schema';
import { UserPermissionsController } from './userPermissions.controller';
import { UserPermissionsService } from './userPermissions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPermission.name, schema: UserPermissionSchema },
    ]),
  ],
  controllers: [UserPermissionsController],
  providers: [UserPermissionsService],
  exports: [MongooseModule, UserPermissionsService],
})
export class UserPermissionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UserPermissionsController);
  }
}
