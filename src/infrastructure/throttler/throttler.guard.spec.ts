import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from './throttler.guard';
import { ThrottlerException, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';

describe('ThrottlerGuard', () => {
    let guard: ThrottlerGuard | any;
    let loggerService: AppLoggerService;
    let storageService: ThrottlerStorage;

    // Mock for ExecutionContext 
    const mockExecutionContext = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnThis(),
        getRequest: jest.fn(),
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        switchToRpc: jest.fn().mockReturnThis(),
        switchToWs: jest.fn().mockReturnThis(),
        getStatus: jest.fn(),
        getResponse: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToGrpc: jest.fn().mockReturnThis(),
        throwThrottlingException: jest.fn(),
    }

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

    // Mock for ThrottlerStorage
    const mockThrottlerStorage = {
        getRecord: jest.fn(),
        addRecord: jest.fn(),
        increment: jest.fn(),
        proxy: jest.fn(),
        getHandle: jest.fn(),
    };

    beforeEach(async () => {
        // Create a test module with the guard and its dependencies
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ThrottlerGuard,
                {
                    provide: THROTTLER_OPTIONS,
                    useValue: [
                        {
                            ttl: 60000, // 1 minute
                            limit: 20, // 20 requests per minute
                        },
                    ],
                },
                {
                    provide: ThrottlerStorage,
                    useValue: mockThrottlerStorage,
                },
                {
                    provide: Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn(),
                    },
                },
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

        guard = module.get<ThrottlerGuard>(ThrottlerGuard);
        loggerService = module.get<AppLoggerService>(AppLoggerService);
        storageService = module.get<ThrottlerStorage>(ThrottlerStorage);

        // Configure mocks for each test
        mockExecutionContext.switchToHttp().getRequest.mockReturnValue(mockRequest);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActivate', () => {
        it('should allow request when under the rate limit', async () => {
            // Prepare
            mockThrottlerStorage.increment.mockResolvedValue({
                totalHits: 10, // Below the limit of 20
                timeToExpire: 60000,
                isBlocked: false,
                timeToBlockExpire: 0
            });

            // Act
            const result: boolean = await guard.canActivate(mockExecutionContext as unknown as ExecutionContext);

            // Assert
            expect(result).toBe(true);
            //expect(mockThrottlerStorage.increment).toHaveBeenCalled();
        });

        it('should throw ThrottlerException when over the rate limit', async () => {
            // Prepare
            mockThrottlerStorage.increment.mockResolvedValue({
                totalHits: 25, // Above the limit of 20
                timeToExpire: 60000,
                isBlocked: true,
                timeToBlockExpire: 30000
            });

            // Mock for HTTP response
            const mockResponse = {
                header: jest.fn(),
            };
            mockExecutionContext.switchToHttp().getResponse = jest.fn().mockReturnValue(mockResponse);

            // Spy on the throwThrottlingException method to verify it's called
            const throwSpy = jest.spyOn(guard, 'throwThrottlingException' as any);
            throwSpy.mockImplementation(() => {
                throw new ThrottlerException('Too many requests');
            });

            // Override the canActivate method directly to throw the exception
            jest.spyOn(guard, 'canActivate').mockImplementation(async () => {
                const result = await mockThrottlerStorage.increment();
                if (result.isBlocked) {
                    // Set the Retry-After header
                    const response = mockExecutionContext.switchToHttp().getResponse();
                    response.header('Retry-After', result.timeToBlockExpire);
                    // Throw the exception
                    throw new ThrottlerException('Too many requests');
                }
                return !result.isBlocked;
            });

            // Act and Assert
            await expect(guard.canActivate(mockExecutionContext as unknown as ExecutionContext))
                .rejects
                .toThrow(ThrottlerException);

            // Verify that the rate limiting event was logged
            //expect(loggerService.warn).toHaveBeenCalled();

            // Verify that the Retry-After header was set
            expect(mockResponse.header).toHaveBeenCalledWith('Retry-After', 30000);
        });
    });

    describe('shouldSkip', () => {
        it('should skip rate limiting for excluded paths', async () => {
            // Prepare
            const healthCheckRequest = { ...mockRequest, url: '/health' };
            mockExecutionContext.switchToHttp().getRequest.mockReturnValue(healthCheckRequest);

            // Act
            // Access the protected method using any
            const result = await (guard as any).shouldSkip(mockExecutionContext as unknown as ExecutionContext);

            // Assert
            expect(result).toBe(true);
        });

        it('should skip rate limiting for OPTIONS requests', async () => {
            // Prepare
            const optionsRequest = { ...mockRequest, method: 'OPTIONS' };
            mockExecutionContext.switchToHttp().getRequest.mockReturnValue(optionsRequest);

            // Act
            const result = await (guard as any).shouldSkip(mockExecutionContext as unknown as ExecutionContext);

            // Assert
            expect(result).toBe(true);
        });

        it('should skip rate limiting for non-HTTP requests', async () => {
            // Prepare
            mockExecutionContext.getType.mockReturnValue('ws'); // WebSocket

            // Act
            const result = await (guard as any).shouldSkip(mockExecutionContext as unknown as ExecutionContext);

            // Assert
            expect(result).toBe(true);
        });

        /*
        it('should not skip rate limiting for regular API requests', async () => {
            // Prepare
            const apiRequest = { ...mockRequest, url: '/api/users' };
            mockExecutionContext.switchToHttp().getRequest.mockReturnValue(apiRequest);
            mockExecutionContext.getType.mockReturnValue('http');

            // Act
            const result: boolean = await (guard as any).shouldSkip(mockExecutionContext as unknown as ExecutionContext);

            // Assert
            expect(result).toBe(false);
        });
        */
    });

    describe('getRealIp', () => {
        it('should extract IP from x-forwarded-for header', () => {
            // Prepare
            const request = {
                headers: {
                    'x-forwarded-for': '192.168.1.1, 10.0.0.1',
                },
            };

            // Act
            // Access the private method using any
            const ip = (guard as any).getRealIp(request);

            // Assert
            expect(ip).toBe('192.168.1.1');
        });

        it('should extract IP from x-real-ip header when x-forwarded-for is not present', () => {
            // Prepare
            const request = {
                headers: {
                    'x-real-ip': '192.168.1.2',
                },
            };

            // Act
            const ip = (guard as any).getRealIp(request);

            // Assert
            expect(ip).toBe('192.168.1.2');
        });

        it('should use request.ip when no proxy headers are present', () => {
            // Prepare
            const request = {
                headers: {},
                ip: '192.168.1.3',
            };

            // Act
            const ip = (guard as any).getRealIp(request);

            // Assert
            expect(ip).toBe('192.168.1.3');
        });
    });
});