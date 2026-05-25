import { SetMetadata } from '@nestjs/common';

export const BYPASS_PERMISSION_KEY = 'bypass_permission';

/**
 * Decorador para métodos que deben saltarse la verificación de permisos,
 * incluso si el controller tiene @RequirePermission a nivel de clase.
 *
 * @example
 * ```typescript
 * @Controller('api/activities')
 * @RequirePermission('16')
 * export class ActivitiesController {
 *   @Get('count-all-activities')
 *   @BypassPermission()
 *   findCountAll() { ... }
 * }
 * ```
 */
export const BypassPermission = () =>
  SetMetadata(BYPASS_PERMISSION_KEY, true);
