import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';
import { AppLoggerService } from '../../helpers/logger/logger.service';

/**
 * Custom filter to handle ThrottlerException exceptions
 * Provides a structured response when the request limit is exceeded
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
    constructor(private readonly logger: AppLoggerService) { }

    catch(exception: ThrottlerException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // Get request information for logging
        const ip = this.getRealIp(request);
        const url = request.url;
        const method = request.method;
        const userAgent = request.headers['user-agent'] || 'unknown';

        // Log the rate limiting event
        this.logger.warn(
            `Rate limit exceeded - IP: ${ip}, Method: ${method}, URL: ${url}, User-Agent: ${userAgent}`
        );

        // Calculate the recommended wait time (60 seconds by default)
        const retryAfter = 60; // seconds

        // Send a structured response
        response
            .status(HttpStatus.TOO_MANY_REQUESTS)
            .header('Retry-After', String(retryAfter))
            .json({
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: 'You have exceeded the request limit. Please try again later.',
                error: 'Too Many Requests',
                timestamp: new Date().toISOString(),
                path: request.url,
                retryAfter: `${retryAfter} seconds`,
            });
    }

    /**
     * Gets the real IP address of the client considering proxy headers
     */
    private getRealIp(request: any): string {
        // Check common proxy headers in order of reliability
        const forwardedFor = request.headers['x-forwarded-for'];
        if (forwardedFor) {
            // Get the first IP in the list, which is usually the client's real IP
            const ips = forwardedFor.split(',');
            return ips[0].trim();
        }

        // Check other common headers
        const realIp = request.headers['x-real-ip'];
        if (realIp) {
            return realIp;
        }

        // Use the remote address of the connection as a last resort
        return request.ip || request.connection?.remoteAddress || 'unknown';
    }
}