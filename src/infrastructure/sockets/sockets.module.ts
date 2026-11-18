import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RankingModule } from '../../domains/rankings/ranking.module';
import { AppGateway } from './appGateway.gateway';
import { EventsGateway } from './events.gateway';

/**
 * Módulo único de sockets.
 *
 * Los gateways se declaran una sola vez y se exportan. 
 */
@Module({
  imports: [
    RankingModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AppGateway, EventsGateway],
  exports: [AppGateway, EventsGateway],
})
export class SocketsModule {}
