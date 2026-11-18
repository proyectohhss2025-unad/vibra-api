import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { CaptchaService } from './captcha.service';

/**
 * Pruebas unitarias del captcha propio.
 * Cubren emisión, verificación, un solo uso, expiración, intentos y bloqueo por IP.
 */
describe('CaptchaService', () => {
  let service: CaptchaService;
  let model: any;
  let securityService: any;
  let logger: any;

  const challengeQuery = (result: any) => {
    const query: any = {
      select: jest.fn(() => query),
      lean: jest.fn(() => query),
      exec: jest.fn().mockResolvedValue(result),
    };
    return query;
  };

  const emittedChallenge = () => model.create.mock.calls[0][0];

  const docFromCreate = (overrides: Record<string, any> = {}) => ({
    challengeId: 'abc',
    answerHash: (service as any).hashAnswer('abc', '5'),
    kind: 'sum',
    issuedAt: new Date(Date.now() - 5000),
    expiresAt: new Date(Date.now() + 60_000),
    attempts: 0,
    consumedAt: null,
    flow: 'register',
    ...overrides,
  });

  const getCode = async (promise: Promise<any>): Promise<any> => {
    try {
      await promise;
      throw new Error('Se esperaba una excepción de captcha');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      return (error as BadRequestException).getResponse() as any;
    }
  };

  beforeEach(() => {
    model = {
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      updateOne: jest.fn(() => challengeQuery({ modifiedCount: 1 })),
      findOneAndUpdate: jest.fn(() => challengeQuery({ challengeId: 'x' })),
    };

    const configService = {
      get: jest.fn((key: string) =>
        key === 'CAPTCHA_SECRET' ? 'test-secret' : undefined,
      ),
    };

    securityService = { blockIP: jest.fn().mockResolvedValue({}) };
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    service = new CaptchaService(
      model,
      configService as any,
      securityService as any,
      logger as any,
    );

    // Reto determinista: la respuesta correcta siempre es "5".
    jest.spyOn(service as any, 'generateChallenge').mockReturnValue({
      kind: 'sum',
      prompt: '¿Cuánto es 2 + 3?',
      answer: '5',
    });
  });

  describe('issue', () => {
    it('emite un reto sin exponer la respuesta', async () => {
      const response = await service.issue({ ip: '1.2.3.4', flow: 'register' });

      expect(response.challengeId).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.prompt).toBe('¿Cuánto es 2 + 3?');
      expect(response.expiresIn).toBe(300);
      expect(response).not.toHaveProperty('answer');

      const stored = emittedChallenge();
      expect(stored.answerHash).toHaveLength(64);
      expect(stored.answerHash).not.toBe('5');
      expect(stored.ipHash).toBeDefined();
      expect(stored.ipHash).not.toContain('1.2.3.4');
    });

    it('responde 503 si no puede persistir el reto', async () => {
      model.create.mockRejectedValue(new Error('mongo caído'));

      await expect(service.issue()).rejects.toMatchObject({
        status: 503,
      });
    });
  });

  describe('verifyOrThrow', () => {
    it('acepta la respuesta correcta y consume el reto', async () => {
      const issued = await service.issue({ ip: '10.0.0.8' });
      model.findOne.mockReturnValue(
        challengeQuery(
          docFromCreate({
            challengeId: issued.challengeId,
            answerHash: (service as any).hashAnswer(issued.challengeId, '5'),
          }),
        ),
      );

      await expect(
        service.verifyOrThrow({
          challengeId: issued.challengeId,
          answer: ' 5 ',
          ip: '10.0.0.8',
          flow: 'register',
        }),
      ).resolves.toBeUndefined();

      expect(model.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('rechaza cuando falta el reto o la respuesta', async () => {
      const code = await getCode(service.verifyOrThrow({ answer: '' } as any));
      expect(code).toMatchObject({ code: 'CAPTCHA_REQUIRED' });
    });

    it('rechaza un reto inexistente', async () => {
      model.findOne.mockReturnValue(challengeQuery(null));
      const code = await getCode(
        service.verifyOrThrow({ challengeId: 'no-existe', answer: '5' }),
      );
      expect(code).toMatchObject({ code: 'CAPTCHA_INVALID' });
    });

    it('rechaza un reto ya consumido (replay)', async () => {
      model.findOne.mockReturnValue(
        challengeQuery(docFromCreate({ consumedAt: new Date() })),
      );

      const code = await getCode(
        service.verifyOrThrow({ challengeId: 'abc', answer: '5' }),
      );
      expect(code).toMatchObject({ code: 'CAPTCHA_USED' });
    });

    it('rechaza un reto expirado y lo marca como consumido', async () => {
      model.findOne.mockReturnValue(
        challengeQuery(
          docFromCreate({ expiresAt: new Date(Date.now() - 1000) }),
        ),
      );

      const code = await getCode(
        service.verifyOrThrow({ challengeId: 'abc', answer: '5' }),
      );
      expect(code).toMatchObject({ code: 'CAPTCHA_EXPIRED' });
      expect(model.updateOne).toHaveBeenCalled();
    });

    it('rechaza cuando se agotaron los intentos', async () => {
      model.findOne.mockReturnValue(
        challengeQuery(docFromCreate({ attempts: 3 })),
      );

      const code = await getCode(
        service.verifyOrThrow({ challengeId: 'abc', answer: '5' }),
      );
      expect(code).toMatchObject({ code: 'CAPTCHA_TOO_MANY_ATTEMPTS' });
    });

    it('rechaza una respuesta demasiado rápida (heurística anti-bot)', async () => {
      model.findOne.mockReturnValue(
        challengeQuery(docFromCreate({ issuedAt: new Date() })),
      );

      const code = await getCode(
        service.verifyOrThrow({
          challengeId: 'abc',
          answer: '5',
          ip: '8.8.8.8',
        }),
      );
      expect(code).toMatchObject({ code: 'CAPTCHA_TOO_FAST' });
    });

    it('incrementa intentos con respuesta incorrecta', async () => {
      model.findOne.mockReturnValue(
        challengeQuery(docFromCreate({ attempts: 0 })),
      );

      const code = await getCode(
        service.verifyOrThrow({
          challengeId: 'abc',
          answer: '99',
          ip: '7.7.7.7',
        }),
      );

      expect(code).toMatchObject({
        code: 'CAPTCHA_INVALID_ANSWER',
        message: expect.stringContaining('2 intento'),
      });
      expect(model.updateOne).toHaveBeenCalledWith(
        { challengeId: 'abc' },
        { $inc: { attempts: 1 } },
      );
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rechaza un reto emitido para otro flujo', async () => {
      model.findOne.mockReturnValue(
        challengeQuery(docFromCreate({ flow: 'register-docente' })),
      );

      const code = await getCode(
        service.verifyOrThrow({
          challengeId: 'abc',
          answer: '5',
          flow: 'register',
        }),
      );
      expect(code).toMatchObject({ code: 'CAPTCHA_INVALID' });
    });
  });

  describe('protección por IP', () => {
    it('bloquea la IP tras 5 fallos en la ventana', async () => {
      for (let i = 0; i < 5; i += 1) {
        (service as any).recordFailure('9.9.9.9', 'wrong_answer');
      }

      await Promise.resolve();
      await Promise.resolve();

      expect(securityService.blockIP).toHaveBeenCalledWith('9.9.9.9', 5);
    });

    it('nunca bloquea IPs internas', async () => {
      for (let i = 0; i < 10; i += 1) {
        (service as any).recordFailure('127.0.0.1', 'wrong_answer');
      }

      await Promise.resolve();
      expect(securityService.blockIP).not.toHaveBeenCalled();
    });
  });
});
