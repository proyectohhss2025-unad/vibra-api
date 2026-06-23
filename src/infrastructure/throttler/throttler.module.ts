import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from './throttler.guard';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // time in milliseconds (1 minute)
        limit: 20, // maximum number of requests in the ttl period
      },
    ]),
    SecurityModule,
  ],
  providers: [ThrottlerGuard],
  exports: [ThrottlerGuard],
})
export class AppThrottlerModule {}
