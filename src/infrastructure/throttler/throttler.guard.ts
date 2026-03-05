import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard, ThrottlerException, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { Reflector } from '@nestjs/core';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
    // Paths that should be excluded from rate limiting
    private readonly skipPaths = ['/api', '/health', '/docs'];

    constructor(
        @Inject(THROTTLER_OPTIONS)
        protected readonly options: ThrottlerModuleOptions,
        @Inject(ThrottlerStorage)
        protected readonly storageService: ThrottlerStorage,
        protected readonly reflector: Reflector,
        private readonly logger: AppLoggerService
    ) {
        super(options, storageService, reflector);
        this.logger.log('ThrottlerGuard initialized');
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

    protected throwThrottlingException(context: ExecutionContext): Promise<void> {
        const request = context.switchToHttp().getRequest();
        const ip = this.getRealIp(request);
        const url = request.url;
        const method = request.method;
        const userAgent = request.headers['user-agent'] || 'unknown';

        // Log detailed information about the rate-limited request
        this.logger.warn(
            `Rate limit exceeded - IP: ${ip}, Method: ${method}, URL: ${url}, User-Agent: ${userAgent}`
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
        if (this.skipPaths.some(path => request.url.startsWith(path))) {
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
}