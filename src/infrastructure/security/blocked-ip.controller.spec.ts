import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BlockedIpController } from './blocked-ip.controller';
import { SecurityService } from './security.service';

describe('BlockedIpController', () => {
    let controller: BlockedIpController;
    let mockSecurityService: any;

    const mockIp = '192.168.1.100';
    const mockAdminId = 'admin-123';

    const mockBlockedIp = {
        ip: mockIp,
        attemptCount: 5,
        blockedAt: new Date('2026-06-22'),
        releasedAt: null,
        releasedBy: null,
        relapseCount: 0,
        blockedBy: 'auto',
        relapseHistory: [],
        metadata: {
            status: 'success',
            country: 'Colombia',
            countryCode: 'CO',
            isp: 'Claro',
        },
        createdAt: new Date('2026-06-22'),
        updatedAt: new Date('2026-06-22'),
    };

    beforeEach(async () => {
        mockSecurityService = {
            getBlockedIps: jest.fn(),
            getBlockedIp: jest.fn(),
            releaseIP: jest.fn(),
            deleteBlockedIp: jest.fn(),
            refreshIpMetadata: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BlockedIpController],
            providers: [
                {
                    provide: SecurityService,
                    useValue: mockSecurityService,
                },
            ],
        }).compile();

        controller = module.get<BlockedIpController>(BlockedIpController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ─── findAll ───────────────────────────────────────────────────────

    describe('findAll', () => {
        it('should return paginated list without filter', async () => {
            // Arrange
            const mockResult = {
                data: [mockBlockedIp],
                total: 1,
                page: 1,
                pageSize: 20,
            };
            mockSecurityService.getBlockedIps.mockResolvedValue(mockResult);

            // Act
            const result = await controller.findAll({ page: 1, limit: 20 });

            // Assert
            expect(result.data).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(20);
            expect(mockSecurityService.getBlockedIps).toHaveBeenCalledWith(
                1, 20, undefined,
            );
        });

        it('should pass filter parameter when provided', async () => {
            // Arrange
            mockSecurityService.getBlockedIps.mockResolvedValue({
                data: [],
                total: 0,
                page: 1,
                pageSize: 10,
            });

            // Act
            await controller.findAll({ page: 1, limit: 10, filter: 'blocked' });

            // Assert
            expect(mockSecurityService.getBlockedIps).toHaveBeenCalledWith(
                1, 10, 'blocked',
            );
        });

        it('should use defaults when no query params provided', async () => {
            // Arrange
            mockSecurityService.getBlockedIps.mockResolvedValue({
                data: [],
                total: 0,
                page: 1,
                pageSize: 20,
            });

            // Act
            await controller.findAll({});

            // Assert
            expect(mockSecurityService.getBlockedIps).toHaveBeenCalledWith(
                1, 20, undefined,
            );
        });
    });

    // ─── findOne ───────────────────────────────────────────────────────

    describe('findOne', () => {
        it('should return a blocked IP by IP address', async () => {
            // Arrange
            mockSecurityService.getBlockedIp.mockResolvedValue(mockBlockedIp);

            // Act
            const result = await controller.findOne(mockIp);

            // Assert
            expect(result.ip).toBe(mockIp);
            expect(mockSecurityService.getBlockedIp).toHaveBeenCalledWith(mockIp);
        });

        it('should propagate NotFoundException', async () => {
            // Arrange
            mockSecurityService.getBlockedIp.mockRejectedValue(
                new NotFoundException(`IP "${mockIp}" no encontrada`),
            );

            // Act & Assert
            await expect(controller.findOne(mockIp)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    // ─── refreshInfo ───────────────────────────────────────────────────

    describe('refreshInfo', () => {
        it('should refresh metadata and return updated IP', async () => {
            // Arrange
            const updatedIp = {
                ...mockBlockedIp,
                metadata: { ...mockBlockedIp.metadata, country: 'Updated' },
            };
            mockSecurityService.refreshIpMetadata.mockResolvedValue(updatedIp);

            // Act
            const result = await controller.refreshInfo(mockIp);

            // Assert
            expect(result.metadata.country).toBe('Updated');
            expect(mockSecurityService.refreshIpMetadata).toHaveBeenCalledWith(mockIp);
        });
    });

    // ─── release ───────────────────────────────────────────────────────

    describe('release', () => {
        it('should release IP and return success message', async () => {
            // Arrange
            mockSecurityService.releaseIP.mockResolvedValue({
                ip: mockIp,
                releasedAt: new Date(),
                releasedBy: mockAdminId,
            });

            const mockReq = { user: { userId: mockAdminId } };

            // Act
            const result = await controller.release(mockIp, mockReq as any);

            // Assert
            expect(result.success).toBe(true);
            expect(result.ip).toBe(mockIp);
            expect(result.message).toContain(mockIp);
            expect(mockSecurityService.releaseIP).toHaveBeenCalledWith(
                mockIp,
                mockAdminId,
            );
        });

        it('should handle missing user in request', async () => {
            // Arrange
            mockSecurityService.releaseIP.mockResolvedValue({});

            // Act
            const result = await controller.release(mockIp, { user: null } as any);

            // Assert
            expect(mockSecurityService.releaseIP).toHaveBeenCalledWith(
                mockIp,
                'unknown',
            );
        });
    });

    // ─── remove ────────────────────────────────────────────────────────

    describe('remove', () => {
        it('should delete IP and return success', async () => {
            // Arrange
            mockSecurityService.deleteBlockedIp.mockResolvedValue(undefined);

            // Act
            const result = await controller.remove(mockIp);

            // Assert
            expect(result.success).toBe(true);
            expect(result.message).toContain(mockIp);
            expect(mockSecurityService.deleteBlockedIp).toHaveBeenCalledWith(mockIp);
        });

        it('should propagate error when IP not found', async () => {
            // Arrange
            mockSecurityService.deleteBlockedIp.mockRejectedValue(
                new NotFoundException(`IP "${mockIp}" no encontrada`),
            );

            // Act & Assert
            await expect(controller.remove(mockIp)).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
