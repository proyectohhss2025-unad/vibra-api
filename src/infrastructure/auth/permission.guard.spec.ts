import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/domains/auth/auth.service';
import { PermissionCacheService } from '../cache/permission-cache.service';
import { PermissionGuard } from './permission.guard';
import { BYPASS_PERMISSION_KEY } from './bypass-permission.decorator';
import { REQUIRE_AUTHENTICATED_KEY } from './require-authenticated.decorator';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';

type Metadata = Record<string, unknown>;

const buildContext = (headers: Record<string, string> = {}) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/api/activities/today',
        originalUrl: '/api/activities/today',
        headers,
      }),
    }),
  }) as unknown as ExecutionContext;

/**
 * Crea el guard con un Reflector que devuelve la metadata del endpoint
 * bajo prueba y mocks del resto de dependencias.
 */
const buildGuard = (
  metadata: Metadata,
  options: {
    tokenUserId?: string | null;
    isSuperAdmin?: boolean;
    serials?: string[];
    resolvePermissionsThrows?: boolean;
  } = {},
) => {
  const reflector = {
    getAllAndOverride: (key: string) => metadata[key],
  } as unknown as Reflector;

  const jwtService = {
    // El guard llama a verify() de forma síncrona: el mock debe lanzar,
    // no devolver una promesa rechazada (quedaría como unhandled rejection).
    verify: () => {
      if (options.tokenUserId) {
        return { sub: options.tokenUserId };
      }
      throw new Error('invalid token');
    },
  } as unknown as JwtService;

  const authService = {
    resolvePermissions: async () => {
      if (options.resolvePermissionsThrows) {
        throw new Error('db no disponible');
      }
      return {
        isSuperAdmin: options.isSuperAdmin ?? false,
        role: null,
        permissions: [],
        serials: options.serials ?? [],
      };
    },
  } as unknown as AuthService;

  const cacheService = {
    getOrSet: async (_key: string, factory: () => Promise<unknown>) =>
      factory(),
  } as unknown as PermissionCacheService;

  return new PermissionGuard(
    reflector,
    jwtService,
    authService,
    cacheService,
  );
};

const bearer = (userId: string) => ({
  authorization: `Bearer fake.${userId}.token`,
});

describe('PermissionGuard', () => {
  describe('sin decoradores', () => {
    it('deja pasar peticiones anónimas', async () => {
      const guard = buildGuard({});
      await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    });
  });

  describe('@BypassPermission', () => {
    it('deja pasar aunque no haya token', async () => {
      const guard = buildGuard({ [BYPASS_PERMISSION_KEY]: true });
      await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    });
  });

  describe('@RequireAuthenticated', () => {
    it('permite el acceso a cualquier usuario autenticado sin serial', async () => {
      const guard = buildGuard(
        { [REQUIRE_AUTHENTICATED_KEY]: true, [REQUIRE_PERMISSION_KEY]: '16' },
        { tokenUserId: 'usuario-1', serials: [] },
      );

      await expect(
        guard.canActivate(buildContext(bearer('usuario-1'))),
      ).resolves.toBe(true);
    });

    it('rechaza con 401 cuando falta el token', async () => {
      const guard = buildGuard({ [REQUIRE_AUTHENTICATED_KEY]: true });

      await expect(guard.canActivate(buildContext())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rechaza con 401 cuando el token es inválido', async () => {
      const guard = buildGuard(
        { [REQUIRE_AUTHENTICATED_KEY]: true },
        { tokenUserId: null },
      );

      await expect(
        guard.canActivate(buildContext({ authorization: 'Bearer invalido' })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('@RequirePermission', () => {
    it('responde 403 cuando el usuario no tiene el serial', async () => {
      const guard = buildGuard(
        { [REQUIRE_PERMISSION_KEY]: 'P-EST-003' },
        { tokenUserId: 'docente-1', serials: ['P-DOC-001'] },
      );

      await expect(
        guard.canActivate(buildContext(bearer('docente-1'))),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('permite el acceso cuando el usuario tiene el serial', async () => {
      const guard = buildGuard(
        { [REQUIRE_PERMISSION_KEY]: 'P-EST-003' },
        { tokenUserId: 'estudiante-1', serials: ['P-EST-003'] },
      );

      await expect(
        guard.canActivate(buildContext(bearer('estudiante-1'))),
      ).resolves.toBe(true);
    });

    it('permite el acceso al SuperAdmin', async () => {
      const guard = buildGuard(
        { [REQUIRE_PERMISSION_KEY]: 'P-EST-003' },
        { tokenUserId: 'admin-1', isSuperAdmin: true, serials: [] },
      );

      await expect(
        guard.canActivate(buildContext(bearer('admin-1'))),
      ).resolves.toBe(true);
    });

    it('responde 401 cuando no hay token', async () => {
      const guard = buildGuard({ [REQUIRE_PERMISSION_KEY]: 'P-EST-003' });

      await expect(guard.canActivate(buildContext())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('responde 403 cuando falla la resolución de permisos', async () => {
      const guard = buildGuard(
        { [REQUIRE_PERMISSION_KEY]: 'P-EST-003' },
        { tokenUserId: 'usuario-1', resolvePermissionsThrows: true },
      );

      await expect(
        guard.canActivate(buildContext(bearer('usuario-1'))),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
