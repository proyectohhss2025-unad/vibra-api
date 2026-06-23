import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/domains/auth/auth.service';
import { PermissionCacheService } from '../cache/permission-cache.service';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';
import { BYPASS_PERMISSION_KEY } from './bypass-permission.decorator';

/**
 * Guard unificado de autenticación + autorización.
 *
 * 1. Extrae el JWT del header (Authorization o x-access-token)
 * 2. Si hay token válido, lo decodifica y adjunta el usuario a req.user
 * 3. Si el endpoint tiene @RequirePermission, verifica que el usuario
 *    tenga ese permiso (o sea SuperAdmin)
 * 4. Si no tiene @RequirePermission, deja pasar (incluso sin token)
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredSerial = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.originalUrl || request.url;

    // Verificar si el método tiene @BypassPermission (se salta verificación de permisos)
    const bypassPermission = this.reflector.getAllAndOverride<boolean>(
      BYPASS_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Intentar extraer y validar el JWT (SIEMPRE, incluso si hay bypassPermission)
    // Esto asegura que req.user esté poblado para endpoints como avatar/gallery
    // que necesitan el userId del token aunque no requieran permiso específico.
    const userId = await this.tryAuthenticate(request);

    if (bypassPermission) {
      this.logger.debug(`BYPASS ${method} ${url} (skip permission check)`);
      return true;
    }

    // Si el endpoint no requiere permiso, dejar pasar
    if (!requiredSerial) {
      this.logger.debug(`PASS ${method} ${url} (no permission required)`);
      return true;
    }

    // Si requiere permiso pero no hay usuario autenticado
    if (!userId) {
      this.logger.warn(`UNAUTHORIZED ${method} ${url} - missing auth`);
      throw new UnauthorizedException(
        'Se requiere autenticación para acceder a este recurso',
      );
    }

    try {
      // Obtener permisos del usuario (con cache de 60s)
      const permissions = await this.cacheService.getOrSet(
        `user_permissions_${userId}`,
        () => this.authService.resolvePermissions(userId),
      );

      this.logger.debug(
        `User ${userId} permissions: isSuperAdmin=${permissions.isSuperAdmin}, serials=[${permissions.serials}]`,
      );

      // SuperAdmin tiene acceso full
      if (permissions.isSuperAdmin) {
        this.logger.debug(`SUPERADMIN PASS ${method} ${url}`);
        return true;
      }

      // Verificar si el serial requerido está en la lista de seriales del usuario
      const hasPermission = permissions.serials.includes(requiredSerial);

      if (!hasPermission) {
        this.logger.warn(
          `FORBIDDEN ${method} ${url} - required serial: ${requiredSerial}, user has: [${permissions.serials}]`,
        );
        throw new ForbiddenException(
          `Acceso denegado. Se requiere permiso: ${requiredSerial}`,
        );
      }

      this.logger.debug(`PERMISSION OK ${method} ${url}`);
      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `ERROR resolving permissions for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new ForbiddenException('Error al verificar permisos');
    }
  }

  /**
   * Extrae y valida el JWT del request.
   * Si es válido, adjunta el usuario decodificado a req.user
   * y devuelve el userId. Si no hay token, devuelve null.
   */
  private async tryAuthenticate(request: any): Promise<string | null> {
    const authHeader: string | undefined =
      request.headers['authorization'] || request.headers['Authorization'];
    const xAccessToken: string | undefined = request.headers['x-access-token'];

    // Log para depuración
    this.logger.debug(
      `Headers: authorization=${authHeader ? authHeader.substring(0, 50) + '...' : 'NOT SET'}, x-access-token=${xAccessToken ? 'SET' : 'NOT SET'}`,
    );

    let token: string | null = null;

    if (authHeader && typeof authHeader === 'string') {
      const bearerMatch = authHeader.match(/^\s*Bearer\s+(.*)$/i);
      if (bearerMatch) {
        token = bearerMatch[1].trim().replace(/^["']+|["']+$/g, '');
      } else if (authHeader.split('.').length === 3) {
        token = authHeader.replace(/^["']+|["']+$/g, '');
      }
    }

    if (!token && xAccessToken && typeof xAccessToken === 'string') {
      const maybeToken = xAccessToken.replace(/^["']+|["']+$/g, '').trim();
      if (maybeToken.split('.').length === 3) {
        token = maybeToken;
      }
    }

    if (!token) {
      this.logger.debug('No se encontró token en los headers');
      return null;
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      // Adjuntar usuario decodificado al request
      request.user = decoded;
      return decoded.sub || decoded._id;
    } catch (err) {
      this.logger.warn(`Token inválido: ${err.message}`);
      return null;
    }
  }
}
