import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from 'src/infrastructure/auth/jwt.strategy';
import { AppGateway } from 'src/infrastructure/sockets/appGateway.gateway';
import { RankingModule } from '../rankings/ranking.module';
import {
  PermissionTemplate,
  PermissionTemplateSchema,
} from '../permissionTemplates/schemas/permissionTemplate.schema';
import {
  Permission,
  PermissionSchema,
} from '../permissions/schemas/permission.schema';
import {
  UserPermission,
  UserPermissionSchema,
} from '../userPermissions/schemas/userPermission.schema';
import { CacheModule } from 'src/infrastructure/cache/cache.module';

@Module({
  imports: [
    UsersModule,
    RankingModule,
    PassportModule,
    CacheModule,
    MongooseModule.forFeature([
      { name: PermissionTemplate.name, schema: PermissionTemplateSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: UserPermission.name, schema: UserPermissionSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AppGateway],
  exports: [AuthService],
})
export class AuthModule {}
