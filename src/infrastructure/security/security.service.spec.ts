import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { SecurityService } from './security.service';
import { BlockedIp, RelapseEntry } from './schemas/blocked-ip.schema';

describe('SecurityService', () => {
    let service: SecurityService;
    let mockBlockedIpModel: any;

    const mockIp = '192.168.1.100';
    const mockAdminId = 'admin-123';
    const mockDate = new Date('2026-06-22T00:00:00.000Z');

    // Mock ip-api.com response
    const mockIpApiResponse = {
        status: 'success',
        country: 'Colombia',
        countryCode: 'CO',
        region: 'Cundinamarca',
        city: 'Bogotá',
        zip: '110111',
        lat: 4.711,
        lon: -74.0721,
        timezone: 'America/Bogota',
        isp: 'Claro Colombia',
        org: 'Claro',
        as: 'AS28518 CLARO',
        query: mockIp,
    };

    beforeAll(() => {
        // Mock global fetch
        global.fetch = jest.fn();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    beforeEach(async () => {
        // Create mock document with save method
        const createMockDocument = (data: any = {}) => ({
            ...data,
            save: jest.fn().mockResolvedValue(data),
        });

        // Create mock model
        mockBlockedIpModel = jest.fn().mockImplementation((data) =>
            createMockDocument(data),
        );

        // Assign static model methods
        mockBlockedIpModel.findOne = jest.fn();
        mockBlockedIpModel.find = jest.fn();
        mockBlockedIpModel.countDocuments = jest.fn();
        mockBlockedIpModel.deleteOne = jest.fn();
        mockBlockedIpModel.updateOne = jest.fn();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SecurityService,
                {
                    provide: getModelToken(BlockedIp.name),
                    useValue: mockBlockedIpModel,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue(''),
                    },
                },
            ],
        }).compile();

        service = module.get<SecurityService>(SecurityService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ─── blockIP ───────────────────────────────────────────────────────

    describe('blockIP', () => {
        it('should block a new IP and fetch metadata from ip-api', async () => {
            // Arrange
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockIpApiResponse),
            });
            mockBlockedIpModel.findOne.mockResolvedValueOnce(null);

            const mockDoc = {
                ip: mockIp,
                attemptCount: 5,
                blockedAt: mockDate,
                blockedBy: 'auto',
                metadata: mockIpApiResponse,
                save: jest.fn().mockResolvedValue(true),
            };
            mockBlockedIpModel.mockReturnValueOnce(mockDoc);

            // Act
            const result = await service.blockIP(mockIp, 5);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`http://ip-api.com/json/${mockIp}`),
                expect.any(Object),
            );
            expect(mockBlockedIpModel).toHaveBeenCalledWith({
                ip: mockIp,
                attemptCount: 5,
                blockedAt: expect.any(Date),
                blockedBy: 'auto',
                metadata: mockIpApiResponse,
            });
            expect(mockDoc.save).toHaveBeenCalled();
        });

        it('should block IP when ip-api fails (metadata = null)', async () => {
            // Arrange
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));
            mockBlockedIpModel.findOne.mockResolvedValueOnce(null);

            const mockDoc = {
                ip: mockIp,
                attemptCount: 3,
                blockedAt: mockDate,
                blockedBy: 'auto',
                metadata: null,
                save: jest.fn().mockResolvedValue(true),
            };
            mockBlockedIpModel.mockReturnValueOnce(mockDoc);

            // Act
            const result = await service.blockIP(mockIp, 3);

            // Assert
            expect(mockBlockedIpModel).toHaveBeenCalledWith(
                expect.objectContaining({
                    ip: mockIp,
                    metadata: null,
                }),
            );
        });

        it('should update attemptCount if IP is already blocked', async () => {
            // Arrange
            const existingDoc = {
                ip: mockIp,
                attemptCount: 5,
                releasedAt: null,
                metadata: null,
                save: jest.fn().mockResolvedValue(true),
            };
            mockBlockedIpModel.findOne.mockResolvedValueOnce(existingDoc);

            // Act
            await service.blockIP(mockIp, 10);

            // Assert
            expect(existingDoc.attemptCount).toBe(10);
            expect(existingDoc.save).toHaveBeenCalled();
            expect(mockBlockedIpModel).not.toHaveBeenCalled(); // No new document
        });

        it('should handle reincidence: IP was released, blocks again', async () => {
            // Arrange
            const existingDoc = {
                ip: mockIp,
                attemptCount: 3,
                blockedAt: new Date('2026-06-20'),
                releasedAt: new Date('2026-06-21'),
                releasedBy: mockAdminId,
                relapseCount: 0,
                relapseHistory: [],
                metadata: null,
                save: jest.fn().mockResolvedValue(true),
            };
            mockBlockedIpModel.findOne.mockResolvedValueOnce(existingDoc);

            // Act
            await service.blockIP(mockIp, 8);

            // Assert
            expect(existingDoc.relapseCount).toBe(1);
            expect(existingDoc.relapseHistory.length).toBe(1);
            expect(existingDoc.relapseHistory[0].attemptCount).toBe(8);
            expect(existingDoc.releasedAt).toBeNull();
            expect(existingDoc.releasedBy).toBeNull();
            expect(existingDoc.attemptCount).toBe(8);
            expect(existingDoc.save).toHaveBeenCalled();
        });
    });

    // ─── releaseIP ─────────────────────────────────────────────────────

    describe('releaseIP', () => {
        it('should release a blocked IP', async () => {
            // Arrange
            const blockedDoc = {
                ip: mockIp,
                releasedAt: null,
                releasedBy: null,
                relapseHistory: [],
                save: jest.fn().mockImplementation(function () { return Promise.resolve(this); }),
            };
            mockBlockedIpModel.findOne.mockResolvedValueOnce(blockedDoc);

            // Act
            const result = await service.releaseIP(mockIp, mockAdminId);

            // Assert
            expect(result.releasedAt).toBeInstanceOf(Date);
            expect(result.releasedBy).toBe(mockAdminId);
            expect(result.save).toHaveBeenCalled();
        });

        it('should update last relapseHistory entry on release', async () => {
            // Arrange
            const lastRelapse = new RelapseEntry();
            lastRelapse.blockedAt = new Date('2026-06-22');
            lastRelapse.releasedAt = null;
            lastRelapse.attemptCount = 5;

            const blockedDoc = {
                ip: mockIp,
                releasedAt: null,
                releasedBy: null,
                relapseHistory: [lastRelapse],
                save: jest.fn().mockImplementation(function () { return Promise.resolve(this); }),
            };
            mockBlockedIpModel.findOne.mockResolvedValueOnce(blockedDoc);

            // Act
            const result = await service.releaseIP(mockIp, mockAdminId);

            // Assert
            expect(result.relapseHistory[0].releasedAt).toEqual(result.releasedAt);
        });

        it('should throw NotFoundException if IP is not blocked', async () => {
            // Arrange
            mockBlockedIpModel.findOne.mockResolvedValueOnce(null);

            // Act & Assert
            await expect(
                service.releaseIP(mockIp, mockAdminId),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if IP is already released', async () => {
            // Arrange
            mockBlockedIpModel.findOne.mockResolvedValueOnce(null);

            // Act & Assert
            await expect(
                service.releaseIP(mockIp, mockAdminId),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ─── isBlocked ─────────────────────────────────────────────────────

    describe('isBlocked', () => {
        it('should return true when IP is blocked', async () => {
            // Arrange
            mockBlockedIpModel.countDocuments.mockResolvedValueOnce(1);

            // Act
            const result = await service.isBlocked(mockIp);

            // Assert
            expect(result).toBe(true);
            expect(mockBlockedIpModel.countDocuments).toHaveBeenCalledWith({
                ip: mockIp,
                releasedAt: null,
            });
        });

        it('should return false when IP is not blocked', async () => {
            // Arrange
            mockBlockedIpModel.countDocuments.mockResolvedValueOnce(0);

            // Act
            const result = await service.isBlocked(mockIp);

            // Assert
            expect(result).toBe(false);
        });
    });

    // ─── getBlockedIps ─────────────────────────────────────────────────

    describe('getBlockedIps', () => {
        const mockData = [
            { ip: '10.0.0.1', blockedAt: new Date(), releasedAt: null },
            { ip: '10.0.0.2', blockedAt: new Date(), releasedAt: new Date() },
        ];

        it('should return paginated list without filter', async () => {
            // Arrange
            mockBlockedIpModel.countDocuments.mockResolvedValueOnce(2);
            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValueOnce(mockData),
            };
            mockBlockedIpModel.find.mockReturnValueOnce(mockQuery);

            // Act
            const result = await service.getBlockedIps(1, 10);

            // Assert
            expect(result.data).toEqual(mockData);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });

        it('should filter by blocked status', async () => {
            // Arrange
            mockBlockedIpModel.countDocuments.mockResolvedValueOnce(1);
            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValueOnce([mockData[0]]),
            };
            mockBlockedIpModel.find.mockReturnValueOnce(mockQuery);

            // Act
            const result = await service.getBlockedIps(1, 10, 'blocked');

            // Assert
            expect(mockBlockedIpModel.find).toHaveBeenCalledWith(
                expect.objectContaining({ releasedAt: null }),
            );
            expect(result.data).toHaveLength(1);
        });
    });

    // ─── getBlockedIp ──────────────────────────────────────────────────

    describe('getBlockedIp', () => {
        it('should return IP detail when found', async () => {
            // Arrange
            const mockDoc = { ip: mockIp, attemptCount: 5 };
            mockBlockedIpModel.findOne.mockResolvedValueOnce(mockDoc);

            // Act
            const result = await service.getBlockedIp(mockIp);

            // Assert
            expect(result).toEqual(mockDoc);
        });

        it('should throw NotFoundException when IP not found', async () => {
            // Arrange
            mockBlockedIpModel.findOne.mockResolvedValueOnce(null);

            // Act & Assert
            await expect(service.getBlockedIp(mockIp)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    // ─── deleteBlockedIp ───────────────────────────────────────────────

    describe('deleteBlockedIp', () => {
        it('should delete IP and return void', async () => {
            // Arrange
            mockBlockedIpModel.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

            // Act
            await service.deleteBlockedIp(mockIp);

            // Assert
            expect(mockBlockedIpModel.deleteOne).toHaveBeenCalledWith({
                ip: mockIp,
            });
        });

        it('should throw NotFoundException when IP not found', async () => {
            // Arrange
            mockBlockedIpModel.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

            // Act & Assert
            await expect(service.deleteBlockedIp(mockIp)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    // ─── recordAttempt ─────────────────────────────────────────────────

    describe('recordAttempt', () => {
        it('should increment attemptCount', async () => {
            // Arrange
            mockBlockedIpModel.updateOne.mockResolvedValueOnce({});

            // Act
            await service.recordAttempt(mockIp);

            // Assert
            expect(mockBlockedIpModel.updateOne).toHaveBeenCalledWith(
                { ip: mockIp },
                { $inc: { attemptCount: 1 } },
            );
        });
    });

    // ─── refreshIpMetadata ─────────────────────────────────────────────

    describe('refreshIpMetadata', () => {
        it('should refresh metadata from ip-api and save', async () => {
            // Arrange
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockIpApiResponse),
            });

            const mockDoc = {
                ip: mockIp,
                metadata: null,
                save: jest.fn().mockImplementation(function () { return Promise.resolve(this); }),
            };
            mockBlockedIpModel.findOne.mockResolvedValueOnce(mockDoc);

            // Act
            const result = await service.refreshIpMetadata(mockIp);

            // Assert
            expect(result.metadata).toEqual(mockIpApiResponse);
            expect(result.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException when IP not found', async () => {
            // Arrange
            mockBlockedIpModel.findOne.mockResolvedValueOnce(null);

            // Act & Assert
            await expect(service.refreshIpMetadata(mockIp)).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
