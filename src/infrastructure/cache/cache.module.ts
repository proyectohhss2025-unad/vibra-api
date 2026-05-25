import { Global, Module } from '@nestjs/common';
import { PermissionCacheService } from './permission-cache.service';

/**
 * Módulo global de cache en memoria.
 * Exporta PermissionCacheService para usar en guards y servicios.
 */
@Global()
@Module({
  providers: [PermissionCacheService],
  exports: [PermissionCacheService],
})
export class CacheModule {}
