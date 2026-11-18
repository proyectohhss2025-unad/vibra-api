/**
 * @deprecated Alias histórico sin uso.
 *
 * El decorador canónico del proyecto es `@RequireAuthenticated()` en
 * `./require-authenticated.decorator` (ya aplicado en `activities` y `users`).
 * Este archivo se conserva únicamente como re-export para no romper imports
 * antiguos; se puede eliminar con `git rm` sin efectos.
 */
export {
  REQUIRE_AUTHENTICATED_KEY as REQUIRE_AUTH_KEY, RequireAuthenticated as RequireAuth
} from './require-authenticated.decorator';
