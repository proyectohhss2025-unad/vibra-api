import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ThrottlerExceptionFilter } from './throttler-exception.filter';
import { AppLoggerService } from '../../helpers/logger/logger.service';

describe('ThrottlerExceptionFilter', () => {
    let filter: ThrottlerExceptionFilter;
    let loggerService: AppLoggerService;

    // Mock for ArgumentsHost
    const mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnThis(),
        getResponse: jest.fn(),
        getRequest: jest.fn(),
    };

    // Mock for Response
    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };

    // Mock for Request
    const mockRequest = {
        url: '/api/test',
        method: 'GET',
        headers: {
            'user-agent': 'test-agent',
            'x-forwarded-for': '192.168.1.1',
        },
        ip: '127.0.0.1',
        connection: {
            remoteAddress: '127.0.0.1',
        },
    };

    beforeEach(async () => {
        // Create a test module with the filter and its dependencies
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ThrottlerExceptionFilter,
                {
                    provide: AppLoggerService,
                    useValue: {
                        warn: jest.fn(),
                        log: jest.fn(),
                        error: jest.fn(),
                    },
                },
            ],
        }).compile();

        filter = module.get<ThrottlerExceptionFilter>(ThrottlerExceptionFilter);
        loggerService = module.get<AppLoggerService>(AppLoggerService);

        // Configure mocks for each test
        mockArgumentsHost.switchToHttp().getResponse.mockReturnValue(mockResponse);
        mockArgumentsHost.switchToHttp().getRequest.mockReturnValue(mockRequest);
    });

    it('should be defined', () => {
        expect(filter).toBeDefined();
    });

    describe('catch', () => {
        it('should handle ThrottlerException correctly', () => {
            // Arrange
            const exception = new ThrottlerException();
            const now = new Date();
            jest.spyOn(global, 'Date').mockImplementation(() => now);

            // Act
            filter.catch(exception, mockArgumentsHost as unknown as ArgumentsHost);

            // Assert
            // Verify that the rate limiting event was logged
            expect(loggerService.warn).toHaveBeenCalledWith(
                expect.stringContaining('Rate limit exceeded - IP: 192.168.1.1')
            );

            // Verify that the correct HTTP status was set
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);

            // Verify that the Retry-After header was set
            expect(mockResponse.header).toHaveBeenCalledWith('Retry-After', '60');

            // Verify that the correct JSON response was sent
            expect(mockResponse.json).toHaveBeenCalledWith({
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: 'You have exceeded the request limit. Please try again later.',
                error: 'Too Many Requests',
                timestamp: now.toISOString(),
                path: '/api/test',
                retryAfter: '60 seconds',
            });
        });
    });

    describe('getRealIp', () => {
        it('should extract IP from x-forwarded-for header', () => {
            // Arrange
            const request = {
                headers: {
                    'x-forwarded-for': '192.168.1.1, 10.0.0.1',
                },
            };

            // Act
            // Access the private method using any
            const ip = (filter as any).getRealIp(request);

            // Assert
            expect(ip).toBe('192.168.1.1');
        });

        it('should extract IP from x-real-ip header when x-forwarded-for is not present', () => {
            // Arrange
            const request = {
                headers: {
                    'x-real-ip': '192.168.1.2',
                },
            };

            // Act
            const ip = (filter as any).getRealIp(request);

            // Assert
            expect(ip).toBe('192.168.1.2');
        });

        it('should use request.ip when no proxy headers are present', () => {
            // Arrange
            const request = {
                headers: {},
                ip: '192.168.1.3',
            };

            // Act
            const ip = (filter as any).getRealIp(request);

            // Assert
            expect(ip).toBe('192.168.1.3');
        });

        it('should use connection.remoteAddress when no other IP sources are available', () => {
            // Arrange
            const request = {
                headers: {},
                connection: {
                    remoteAddress: '192.168.1.4',
                },
            };

            // Act
            const ip = (filter as any).getRealIp(request);

            // Assert
            expect(ip).toBe('192.168.1.4');
        });

        it('should return "unknown" when no IP source is available', () => {
            // Arrange
            const request = {
                headers: {},
            };

            // Act
            const ip = (filter as any).getRealIp(request);

            // Assert
            expect(ip).toBe('unknown');
        });
    });
});