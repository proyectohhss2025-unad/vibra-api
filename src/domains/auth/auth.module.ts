import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/infrastructure/auth/jwt.strategy';
import { CacheModule } from 'src/infrastructure/cache/cache.module';
import { CaptchaModule } from 'src/infrastructure/captcha/captcha.module';
import { SocketsModule } from 'src/infrastructure/sockets/sockets.module';
import {
  PermissionTemplate,
  PermissionTemplateSchema,
} from '../permissionTemplates/schemas/permissionTemplate.schema';
import {
  Permission,
  PermissionSchema,
} from '../permissions/schemas/permission.schema';
import { RankingModule } from '../rankings/ranking.module';
import { RolesModule } from '../roles/roles.module';
import {
  UserPermission,
  UserPermissionSchema,
} from '../userPermissions/schemas/userPermission.schema';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginProtectionService } from './login-protection.service';
import {
  LoginAttempt,
  LoginAttemptSchema,
} from './schemas/login-attempt.schema';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    RankingModule,
    SocketsModule,
    PassportModule,
    CacheModule,
    CaptchaModule,
    MongooseModule.forFeature([
      { name: LoginAttempt.name, schema: LoginAttemptSchema },
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
  providers: [AuthService, JwtStrategy, LoginProtectionService],
  exports: [AuthService],
})
export class AuthModule {}
