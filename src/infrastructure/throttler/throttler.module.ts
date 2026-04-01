import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from './throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // time in milliseconds (1 minute)
        limit: 20, // maximum number of requests in the ttl period
      },
    ]),
  ],
  providers: [ThrottlerGuard],
  exports: [ThrottlerGuard],
})
export class AppThrottlerModule {}
