import { BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * Verifica que el recurso solicitado pertenezca al usuario de la sesión.
 *
 * `PermissionGuard` adjunta `req.user` (payload del JWT) en toda ruta con
 * `@RequireAuthenticated()` o `@RequirePermission()`; `sub` es el `_id` del
 * usuario. Se usa en la superficie mobile, donde el `userId` viaja en la ruta,
 * el query o el body, para que la sesión no alcance datos de terceros.
 *
 * Falla cerrado: si no se puede identificar al solicitante o al dueño, niega.
 *
 * @param req Request de Express (`req.user` lo puebla el guard)
 * @param resourceUserId Dueño del recurso (ObjectId como string)
 */
export function assertOwnership(
  req: any,
  resourceUserId?: string | null,
): void {
  const requesterId = req?.user?.sub;

  if (!requesterId) {
    throw new ForbiddenException(
      'No se pudo identificar al usuario de la sesión.',
    );
  }

  if (!resourceUserId || String(requesterId) !== String(resourceUserId)) {
    throw new ForbiddenException(
      'Solo puedes consultar o modificar tu propia información.',
    );
  }
}

/**
 * Normaliza el body de un endpoint que acepta objeto, string JSON o
 * `{ body: "<json>" }` (compatibilidad con clientes antiguos).
 *
 * @throws BadRequestException si el body no es un JSON/objeto válido.
 */
export function normalizePayload(payload: any): Record<string, any> {
  let value = payload;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      throw new BadRequestException(
        'El cuerpo de la petición no es un JSON válido.',
      );
    }
  }

  if (value && typeof value.body === 'string') {
    try {
      value = JSON.parse(value.body);
    } catch {
      throw new BadRequestException(
        'El cuerpo de la petición no es un JSON válido.',
      );
    }
  }

  if (!value || typeof value !== 'object') {
    throw new BadRequestException('El cuerpo de la petición no es válido.');
  }

  return value;
}
