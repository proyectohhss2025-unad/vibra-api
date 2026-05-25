import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

/**
 * Decorador que declara qué permiso (por su `serial`) se necesita
 * para acceder al endpoint.
 *
 * @example
 * ```typescript
 * @Get()
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission('16')
 * findAll() { ... }
 * ```
 */
export const RequirePermission = (serial: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, serial);
