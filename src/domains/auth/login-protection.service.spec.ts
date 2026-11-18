import { jest } from '@jest/globals';
import { LoginProtectionService } from './login-protection.service';

/**
 * Pruebas del bloqueo temporal de login por usuario.
 * Verifican umbral, ventana, estado de bloqueo, limpieza y normalización.
 */
describe('LoginProtectionService', () => {
  let service: LoginProtectionService;
  let model: any;
  let logger: any;

  const query = (result: any) => {
    const q: any = {
      select: jest.fn(() => q),
      lean: jest.fn(() => q),
      exec: jest.fn().mockResolvedValue(result),
    };
    return q;
  };

  beforeEach(() => {
    model = {
      findOne: jest.fn(() => query(null)),
      updateOne: jest.fn(() => query({ modifiedCount: 1 })),
      findOneAndUpdate: jest.fn(() =>
        query({ failures: 1, lockedUntil: null }),
      ),
      deleteOne: jest.fn(() => query({ deletedCount: 1 })),
    };

    const configService = { get: jest.fn(() => undefined) };
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    service = new LoginProtectionService(
      model,
      configService as any,
      logger as any,
    );
  });

  it('normaliza el username (trim + minúsculas)', () => {
    expect(service.normalizeUsername('  Maria.Gomez ')).toBe('maria.gomez');
    expect(service.normalizeUsername(undefined as any)).toBe('');
  });

  describe('getLockStatus', () => {
    it('devuelve libre cuando no hay registro', async () => {
      await expect(service.getLockStatus('ana')).resolves.toEqual({
        locked: false,
        retryAfterSeconds: 0,
      });
    });

    it('devuelve bloqueado con tiempo restante', async () => {
      model.findOne.mockReturnValue(
        query({ lockedUntil: new Date(Date.now() + 120_000) }),
      );

      const status = await service.getLockStatus('ana');
      expect(status.locked).toBe(true);
      expect(status.retryAfterSeconds).toBeGreaterThan(100);
      expect(status.retryAfterSeconds).toBeLessThanOrEqual(120);
    });

    it('devuelve libre cuando el bloqueo ya expiró', async () => {
      model.findOne.mockReturnValue(
        query({ lockedUntil: new Date(Date.now() - 1000) }),
      );

      await expect(service.getLockStatus('ana')).resolves.toEqual({
        locked: false,
        retryAfterSeconds: 0,
      });
    });
  });

  describe('registerFailure', () => {
    it('no bloquea mientras no se alcance el umbral', async () => {
      model.findOneAndUpdate.mockReturnValue(
        query({ failures: 2, lockedUntil: null }),
      );

      const status = await service.registerFailure('ana');
      expect(status.locked).toBe(false);
      expect(model.updateOne).toHaveBeenCalledTimes(1); // solo reset de ventana
    });

    it('bloquea al alcanzar el máximo de fallos y persiste lockedUntil', async () => {
      model.findOneAndUpdate.mockReturnValue(
        query({ failures: 5, lockedUntil: null }),
      );

      const status = await service.registerFailure('ana');

      expect(status.locked).toBe(true);
      expect(status.retryAfterSeconds).toBe(900); // 15 min
      expect(model.updateOne).toHaveBeenLastCalledWith(
        { username: 'ana' },
        expect.objectContaining({
          $set: expect.objectContaining({ lockedUntil: expect.any(Date) }),
        }),
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('respeta un bloqueo ya activo sin volver a extenderlo', async () => {
      const lockedUntil = new Date(Date.now() + 60_000);
      model.findOneAndUpdate.mockReturnValue(
        query({ failures: 6, lockedUntil }),
      );

      const status = await service.registerFailure('ana');

      expect(status.locked).toBe(true);
      expect(status.retryAfterSeconds).toBeGreaterThan(0);
      // Solo el updateOne del reset de ventana; no se re-bloquea.
      expect(model.updateOne).toHaveBeenCalledTimes(1);
    });

    it('falla abierto si la base de datos falla al contar', async () => {
      model.updateOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('mongo caído')),
      });

      await expect(service.registerFailure('ana')).resolves.toEqual({
        locked: false,
        retryAfterSeconds: 0,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('reintenta una vez ante una carrera de upsert (E11000)', async () => {
      model.findOneAndUpdate
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            lean: jest.fn(() => ({
              exec: jest.fn().mockRejectedValue({ code: 11000 }),
            })),
          })),
        })
        .mockReturnValueOnce(query({ failures: 1, lockedUntil: null }));

      const status = await service.registerFailure('ana');

      expect(status.locked).toBe(false);
      expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('límite por IP (anti password-spraying)', () => {
    it('no bloquea por debajo del umbral', () => {
      for (let i = 0; i < 39; i += 1) {
        (service as any).recordIpFailure('9.9.9.9');
      }

      expect(service.getIpStatus('9.9.9.9').blocked).toBe(false);
    });

    it('bloquea la red al alcanzar el umbral y cuenta el tiempo restante', () => {
      for (let i = 0; i < 40; i += 1) {
        (service as any).recordIpFailure('9.9.9.9');
      }

      const status = service.getIpStatus('9.9.9.9');
      expect(status.blocked).toBe(true);
      expect(status.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('nunca limita IPs internas', () => {
      for (let i = 0; i < 100; i += 1) {
        (service as any).recordIpFailure('127.0.0.1');
      }

      expect(service.getIpStatus('127.0.0.1').blocked).toBe(false);
    });

    it('cuenta la IP al registrar un fallo de login', async () => {
      model.findOneAndUpdate.mockReturnValue(
        query({ failures: 1, lockedUntil: null }),
      );

      await service.registerFailure('ana', '9.9.9.9');
      for (let i = 0; i < 39; i += 1) {
        (service as any).recordIpFailure('9.9.9.9');
      }

      expect(service.getIpStatus('9.9.9.9').blocked).toBe(true);
    });
  });

  describe('reset', () => {
    it('elimina el contador del usuario normalizado', async () => {
      await service.reset('  Ana ');

      expect(model.deleteOne).toHaveBeenCalledWith({ username: 'ana' });
    });

    it('ignora usernames vacíos', async () => {
      await service.reset('   ');
      expect(model.deleteOne).not.toHaveBeenCalled();
    });
  });
});
