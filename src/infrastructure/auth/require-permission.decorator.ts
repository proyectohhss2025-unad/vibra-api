import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

/**
 * Decorador que declara qué permiso(s) (por su `serial`) se necesita(n)
 * para acceder al endpoint.
 *
 * Soporta un único serial o un array de seriales (OR lógico).
 *
 * @example
 * ```typescript
 * // Un solo serial
 * @RequirePermission('16')
 *
 * // Múltiples seriales (OR): el usuario necesita AL MENOS UNO
 * @RequirePermission(['9', 'P-DOC-001'])
 * ```
 */
export const RequirePermission = (serial: string | string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, serial);
