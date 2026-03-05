import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
//import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from 'src/infrastructure/auth/jwt.strategy';
import { AppGateway } from 'src/infrastructure/sockets/appGateway.gateway';
import { RankingModule } from '../rankings/ranking.module';

@Module({
    imports: [
        UsersModule,
        RankingModule,
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'secretKey',
            signOptions: { expiresIn: '24h' },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, AppGateway],
    exports: [AuthService],
})
export class AuthModule { }