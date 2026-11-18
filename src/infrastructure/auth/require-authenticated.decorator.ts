import { SetMetadata } from '@nestjs/common';

export const REQUIRE_AUTHENTICATED_KEY = 'require_authenticated';

/**
 * Decorador para endpoints que sólo exigen un JWT válido, sin pedir un
 * permiso (serial) concreto.
 *
 * Se usa en las lecturas que consume la app mobile del participante: la
 * actividad del día, el listado de retos disponibles y el detalle de una
 * actividad. Cualquier usuario autenticado (estudiante, docente,
 * profesional o administrador) puede consultarlas, pero un request sin
 * token sigue recibiendo 401.
 *
 * A diferencia de `@BypassPermission()`, este decorador NO deja pasar
 * peticiones anónimas: `PermissionGuard` valida el token y lanza
 * `UnauthorizedException` si falta o es inválido.
 *
 * Prioridad de evaluación en `PermissionGuard`:
 * `@BypassPermission` > `@RequireAuthenticated` > `@RequirePermission`.
 *
 * @example
 * ```typescript
 * @RequireAuthenticated()
 * @Get('today')
 * getTodayActivities() { ... }
 * ```
 */
export const RequireAuthenticated = () =>
  SetMetadata(REQUIRE_AUTHENTICATED_KEY, true);
