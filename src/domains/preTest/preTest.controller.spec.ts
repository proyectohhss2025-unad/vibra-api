import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { REQUIRE_AUTHENTICATED_KEY } from 'src/infrastructure/auth/require-authenticated.decorator';
import { REQUIRE_PERMISSION_KEY } from 'src/infrastructure/auth/require-permission.decorator';
import { PreTestController } from './preTest.controller';

const buildService = () => ({
  savePreTestResponse: jest.fn(async (payload: any) => payload),
  getStatusByUserId: jest.fn(async () => ({
    totalTests: 0,
    completedTests: 0,
    pendingTests: 0,
    allCompleted: true,
    tests: [],
  })),
  getOwnerId: jest.fn(async () => null),
  getPreTestResultById: jest.fn(async () => ({ _id: 'result-1' })),
  getAlByUserId: jest.fn(async () => []),
});

const buildController = () => {
  const service = buildService();
  return { service, controller: new PreTestController(service as any) };
};

const session = (sub: string) => ({ user: { sub } });

describe('PreTestController — dueño derivado de la sesión', () => {
  it('save usa el sub del JWT e ignora el userId del cliente', async () => {
    const { service, controller } = buildController();

    await controller.saveTest(session('user-1'), {
      testId: '1',
      userId: 'otro-usuario',
      responses: [],
    });

    expect(service.savePreTestResponse).toHaveBeenCalledWith(
      expect.objectContaining({ testId: '1', userId: 'user-1' }),
    );
  });

  it('save normaliza la variante { body: "<json>" }', async () => {
    const { service, controller } = buildController();

    await controller.saveTest(session('user-1'), {
      body: JSON.stringify({ testId: '2', responses: [] }),
    });

    expect(service.savePreTestResponse).toHaveBeenCalledWith(
      expect.objectContaining({ testId: '2', userId: 'user-1' }),
    );
  });

  it('status/me consulta el estado del usuario de la sesión', async () => {
    const { service, controller } = buildController();

    await controller.getMyStatus(session('user-1'), 'initial');

    expect(service.getStatusByUserId).toHaveBeenCalledWith('user-1', 'initial');
  });

  it('status/:userId rechaza un id que no es de la sesión', async () => {
    const { service, controller } = buildController();

    await expect(
      controller.getStatusByUserId(session('user-1'), 'user-2', 'initial'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getStatusByUserId).not.toHaveBeenCalled();
  });

  it('status/:userId acepta el id propio', async () => {
    const { service, controller } = buildController();

    await controller.getStatusByUserId(session('user-1'), 'user-1', 'initial');

    expect(service.getStatusByUserId).toHaveBeenCalledWith('user-1', 'initial');
  });

  it('result/:id valida propiedad con el dueño resuelto', async () => {
    const { service, controller } = buildController();
    service.getOwnerId.mockResolvedValue('user-2');

    await expect(
      controller.getResultById(session('user-1'), 'result-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getPreTestResultById).not.toHaveBeenCalled();
  });

  it('result/:id permite el resultado propio', async () => {
    const { service, controller } = buildController();
    service.getOwnerId.mockResolvedValue('user-1');

    await controller.getResultById(session('user-1'), 'result-1');

    expect(service.getPreTestResultById).toHaveBeenCalledWith('result-1');
  });

  it('search/user/:userId rechaza la búsqueda de otro usuario', async () => {
    const { controller } = buildController();

    await expect(
      controller.getUserTests(session('user-1'), 'user-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('los endpoints de la sesión exigen sesión y no serial', () => {
    for (const handler of [
      PreTestController.prototype.getMyStatus,
      PreTestController.prototype.saveTest,
      PreTestController.prototype.getStatusByUserId,
    ]) {
      expect(Reflect.getMetadata(REQUIRE_AUTHENTICATED_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, handler)).toBe(
        undefined,
      );
    }
  });
});
