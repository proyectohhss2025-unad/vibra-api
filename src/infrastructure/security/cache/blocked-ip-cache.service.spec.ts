import { Test, TestingModule } from '@nestjs/testing';
import { BlockedIpCacheService } from './blocked-ip-cache.service';

describe('BlockedIpCacheService', () => {
    let service: BlockedIpCacheService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [BlockedIpCacheService],
        }).compile();

        service = module.get<BlockedIpCacheService>(BlockedIpCacheService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    // ─── set / get ─────────────────────────────────────────────────────

    describe('set and get', () => {
        it('should store and retrieve a value', () => {
            // Act
            service.set('192.168.1.1', true);
            const result = service.get('192.168.1.1');

            // Assert
            expect(result).toBe(true);
        });

        it('should store false values correctly', () => {
            // Act
            service.set('192.168.1.2', false);
            const result = service.get('192.168.1.2');

            // Assert
            expect(result).toBe(false);
        });

        it('should return null for non-existent key', () => {
            // Act
            const result = service.get('no-exist');

            // Assert
            expect(result).toBeNull();
        });

        it('should return null after TTL expires', () => {
            // Arrange
            jest.useFakeTimers();
            service.set('192.168.1.1', true, 1); // TTL = 1 second

            // Act - advance time past TTL
            jest.advanceTimersByTime(1500);

            // Assert
            const result = service.get('192.168.1.1');
            expect(result).toBeNull();
        });

        it('should return value before TTL expires', () => {
            // Arrange
            jest.useFakeTimers();
            service.set('192.168.1.1', true, 60); // TTL = 60 seconds

            // Act - still within TTL
            jest.advanceTimersByTime(30000);

            // Assert
            const result = service.get('192.168.1.1');
            expect(result).toBe(true);
        });

        it('should use default TTL of 60 seconds', () => {
            // Arrange
            jest.useFakeTimers();
            service.set('192.168.1.1', true); // No TTL specified

            // Act - 59 seconds later (still valid)
            jest.advanceTimersByTime(59000);
            expect(service.get('192.168.1.1')).toBe(true);

            // Act - 2 seconds later (expired)
            jest.advanceTimersByTime(2000);
            expect(service.get('192.168.1.1')).toBeNull();
        });
    });

    // ─── invalidate ────────────────────────────────────────────────────

    describe('invalidate', () => {
        it('should remove a specific key from cache', () => {
            // Arrange
            service.set('192.168.1.1', true);

            // Act
            service.invalidate('192.168.1.1');

            // Assert
            expect(service.get('192.168.1.1')).toBeNull();
        });

        it('should not affect other keys', () => {
            // Arrange
            service.set('ip1', true);
            service.set('ip2', true);

            // Act
            service.invalidate('ip1');

            // Assert
            expect(service.get('ip1')).toBeNull();
            expect(service.get('ip2')).toBe(true);
        });

        it('should not throw when invalidating non-existent key', () => {
            // Act & Assert
            expect(() => service.invalidate('no-exist')).not.toThrow();
        });
    });

    // ─── cleanup ───────────────────────────────────────────────────────

    describe('cleanup', () => {
        it('should remove all expired entries', () => {
            // Arrange
            jest.useFakeTimers();
            service.set('expired', true, 1);  // TTL = 1s
            service.set('valid', true, 60);   // TTL = 60s

            // Act
            jest.advanceTimersByTime(2000); // Expired key is gone
            service.cleanup();

            // Assert - expired was removed, valid remains
            expect(service.get('expired')).toBeNull();
            expect(service.get('valid')).toBe(true);
        });

        it('should not remove valid entries', () => {
            // Arrange
            jest.useFakeTimers();
            service.set('valid1', true);
            service.set('valid2', false);

            // Act
            jest.advanceTimersByTime(30000); // All still valid
            service.cleanup();

            // Assert
            expect(service.get('valid1')).toBe(true);
            expect(service.get('valid2')).toBe(false);
        });
    });
});
