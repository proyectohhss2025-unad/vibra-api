import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { AuthMiddleware } from 'src/infrastructure/auth/auth.middleware';
import { Permission, PermissionSchema } from '../permissions/schemas/permission.schema';
import { UserPermission, UserPermissionSchema } from '../userPermissions/schemas/userPermission.schema';
import { PermissionTemplatesController } from './permissionTemplates.controller';
import { PermissionTemplatesService } from './permissionTemplates.service';
import { PermissionTemplate, PermissionTemplateSchema } from './schemas/permissionTemplate.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PermissionTemplate.name, schema: PermissionTemplateSchema },
            { name: Permission.name, schema: PermissionSchema },
            { name: UserPermission.name, schema: UserPermissionSchema },
        ]),
        MulterModule.register({
            dest: './uploads',
        }),
    ],
    controllers: [PermissionTemplatesController],
    providers: [PermissionTemplatesService],
    exports: [MongooseModule, PermissionTemplatesService],
})
export class PermissionTemplatesModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(PermissionTemplatesController);
    }
}