import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityService } from './security.service';
import { BlockedIpController } from './blocked-ip.controller';
import { BlockedIpCacheService } from './cache/blocked-ip-cache.service';
import { BlockedIp, BlockedIpSchema } from './schemas/blocked-ip.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlockedIp.name, schema: BlockedIpSchema },
    ]),
  ],
  controllers: [BlockedIpController],
  providers: [SecurityService, BlockedIpCacheService],
  exports: [SecurityService, BlockedIpCacheService],
})
export class SecurityModule {}
