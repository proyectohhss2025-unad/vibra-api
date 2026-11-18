import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { REQUIRE_AUTHENTICATED_KEY } from 'src/infrastructure/auth/require-authenticated.decorator';
import { REQUIRE_PERMISSION_KEY } from 'src/infrastructure/auth/require-permission.decorator';
import { ParticipantController } from './participant.controller';

const buildService = () => ({
  findByUserId: jest.fn(async () => ({ _id: 'participant-1' })),
  updatePointsByUserId: jest.fn(async () => ({ points: 10, level: 'bronce' })),
  getOwnerId: jest.fn(async () => null),
  create: jest.fn(async (dto: any) => dto),
  update: jest.fn(async (dto: any) => dto),
});

const buildController = () => {
  const service = buildService();
  return { service, controller: new ParticipantController(service as any) };
};

const session = (sub: string) => ({ user: { sub } });

describe('ParticipantController — superficie de la sesión', () => {
  it('me devuelve el participante del sub del JWT', async () => {
    const { service, controller } = buildController();

    await controller.findMine(session('user-1'));

    expect(service.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('by-user/:userId rechaza el id de otro usuario', () => {
    const { service, controller } = buildController();

    expect(() => controller.findByUserId(session('user-1'), 'user-2')).toThrow(
      ForbiddenException,
    );
    expect(service.findByUserId).not.toHaveBeenCalled();
  });

  it('by-user/:userId acepta el id propio', async () => {
    const { service, controller } = buildController();

    await controller.findByUserId(session('user-1'), 'user-1');

    expect(service.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('me/points actualiza los puntos sin que el cliente envíe el participante', async () => {
    const { service, controller } = buildController();
    const dto = { pointsIncrement: 5, activityCompleted: true };

    await controller.updateMyPoints(session('user-1'), dto as any);

    expect(service.updatePointsByUserId).toHaveBeenCalledWith('user-1', dto);
  });

  it('create no permite crear un participante a nombre de otro usuario', () => {
    const { service, controller } = buildController();

    expect(() =>
      controller.create(session('user-1'), {
        userId: 'user-2',
        nickname: 'otro',
      } as any),
    ).toThrow(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('update no permite modificar el participante de otro usuario', async () => {
    const { service, controller } = buildController();
    service.getOwnerId.mockResolvedValue('user-2');

    await expect(
      controller.update(session('user-1'), { _id: 'participant-1' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('update permite modificar el participante propio', async () => {
    const { service, controller } = buildController();
    service.getOwnerId.mockResolvedValue('user-1');

    await controller.update(session('user-1'), { _id: 'participant-1' } as any);

    expect(service.update).toHaveBeenCalled();
  });

  it('me y me/points exigen sesión sin serial', () => {
    for (const handler of [
      ParticipantController.prototype.findMine,
      ParticipantController.prototype.updateMyPoints,
      ParticipantController.prototype.findByUserId,
    ]) {
      expect(Reflect.getMetadata(REQUIRE_AUTHENTICATED_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, handler)).toBe(
        undefined,
      );
    }
  });

  it('create, update y :id/points conservan su serial', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        ParticipantController.prototype.create,
      ),
    ).toBe('P-EST-007');
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        ParticipantController.prototype.update,
      ),
    ).toBe('P-EST-005');
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        ParticipantController.prototype.updatePoints,
      ),
    ).toBe('P-EST-004');
  });
});
