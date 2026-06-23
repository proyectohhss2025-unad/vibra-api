import {
  Injectable,
  ExecutionContext,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ThrottlerGuard as NestThrottlerGuard,
  ThrottlerException,
  ThrottlerModuleOptions,
  ThrottlerStorage,
  ThrottlerRequest,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { Reflector } from '@nestjs/core';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';
import { SecurityService } from '../security/security.service';
import { BlockedIpCacheService } from '../security/cache/blocked-ip-cache.service';

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
  // Paths that should be excluded from rate limiting
  private readonly skipPaths = ['/api', '/health', '/docs'];
  // IPs internas que nunca se bloquean
  private readonly internalIps = new Set([
    '127.0.0.1',
    '::1',
    'localhost',
    'unknown',
  ]);

  constructor(
    @Inject(THROTTLER_OPTIONS)
    protected readonly options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorage)
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
    private readonly logger: AppLoggerService,
    private readonly securityService: SecurityService,
    private readonly blockedIpCache: BlockedIpCacheService,
  ) {
    super(options, storageService, reflector);
    this.logger.log('ThrottlerGuard initialized with IP blocking');
  }

  /**
   * Gets the real IP address considering various headers that might be set by proxies
   * @param request The HTTP request object
   * @returns The client's real IP address
   */
  private getRealIp(request: any): string {
    // Check for common proxy headers in order of reliability
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // Get the first IP in the list which is typically the client's real IP
      const ips = forwardedFor.split(',');
      return ips[0].trim();
    }

    // Check other common headers
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fall back to the connection remote address
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * Override de handleRequest para agregar verificación de IP bloqueada
   * ANTES del rate limiting, y bloqueo automático cuando se excede el límite.
   * @nestjs/throttler v6 usa ThrottlerRequest como único argumento.
   */
  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;
    const request = context.switchToHttp().getRequest();
    const ip = this.getRealIp(request);

    // ── 1. Skip para IPs internas ────────────────────────────────────
    if (!this.internalIps.has(ip)) {
      // ── 2. Verificar si la IP está bloqueada ───────────────────────
      const cacheResult = this.blockedIpCache.get(ip);
      if (cacheResult === true) {
        this.logger.warn(`Blocked IP attempted request: ${ip}`);
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: 'IP bloqueada por actividad sospechosa',
            error: 'Forbidden',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (cacheResult === null) {
        // Cache miss → consultar BD
        try {
          const blocked = await this.securityService.isBlocked(ip);
          this.blockedIpCache.set(ip, blocked);
          if (blocked) {
            this.logger.warn(`Blocked IP detected (DB): ${ip}`);
            throw new HttpException(
              {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'IP bloqueada por actividad sospechosa',
                error: 'Forbidden',
              },
              HttpStatus.FORBIDDEN,
            );
          }
        } catch (error) {
          if (error instanceof HttpException) throw error;
          this.logger.error(
            `Error checking blocked IP ${ip}: ${error.message}`,
          );
        }
      }
    }

    // ── 3. Rate limiting normal ──────────────────────────────────────
    try {
      return await super.handleRequest(requestProps);
    } catch (error) {
      // ── 4. Si excedió límite → bloquear IP automáticamente ────────
      if (error instanceof ThrottlerException && !this.internalIps.has(ip)) {
        this.blockIPAsync(ip);
      }
      throw error;
    }
  }

  protected throwThrottlingException(
    context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getRealIp(request);
    const url = request.url;
    const method = request.method;
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Log detailed information about the rate-limited request
    this.logger.warn(
      `Rate limit exceeded - IP: ${ip}, Method: ${method}, URL: ${url}, User-Agent: ${userAgent}`,
    );

    throw new ThrottlerException('Too many requests, please try again later.');
  }

  /**
   * Determines whether rate limiting should be skipped for this request
   * @param context The execution context
   * @returns True if rate limiting should be skipped, false otherwise
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip if not an HTTP request
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Skip for specific paths (API docs, health checks, etc.)
    if (this.skipPaths.some((path) => request.url.startsWith(path))) {
      return true;
    }

    // Skip for specific request methods if needed (e.g., OPTIONS requests)
    if (request.method === 'OPTIONS') {
      return true;
    }

    // Could add additional conditions here, such as:
    // - Skip for specific IP addresses (e.g., internal network)
    // - Skip for authenticated admin users
    // - Skip based on custom headers

    return false;
  }

  /**
   * Bloquea una IP de forma asíncrona (fire & forget).
   * Se ejecuta después de que el rate limit detecta abuso.
   */
  private blockIPAsync(ip: string): void {
    this.securityService.blockIP(ip).catch((err) => {
      this.logger.error(`Failed to auto-block IP ${ip}: ${err.message}`);
    });
  }
}
