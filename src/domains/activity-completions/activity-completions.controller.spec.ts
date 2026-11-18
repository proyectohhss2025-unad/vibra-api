import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { REQUIRE_AUTHENTICATED_KEY } from 'src/infrastructure/auth/require-authenticated.decorator';
import { ActivityCompletionsController } from './activity-completions.controller';

const buildService = () => ({
  getParticipantOwnerId: jest.fn(async () => null),
  create: jest.fn(async (dto: any) => dto),
});

const buildController = () => {
  const service = buildService();
  return {
    service,
    controller: new ActivityCompletionsController(service as any),
  };
};

const session = (sub: string) => ({ user: { sub } });

const completion = {
  participant: 'participant-1',
  activity: 'activity-1',
  plannedScore: 10,
  achievedScore: 8,
};

describe('ActivityCompletionsController — propiedad del participante', () => {
  it('registra la completación del participante propio', async () => {
    const { service, controller } = buildController();
    service.getParticipantOwnerId.mockResolvedValue('user-1');

    await controller.create(session('user-1'), completion);

    expect(service.create).toHaveBeenCalledWith(completion);
  });

  it('rechaza la completación de un participante ajeno', async () => {
    const { service, controller } = buildController();
    service.getParticipantOwnerId.mockResolvedValue('user-2');

    await expect(
      controller.create(session('user-1'), completion),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('falla cerrado si el participante no existe', async () => {
    const { service, controller } = buildController();
    service.getParticipantOwnerId.mockResolvedValue(null);

    await expect(
      controller.create(session('user-1'), completion),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('exige sesión sin serial para registrar completaciones', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_AUTHENTICATED_KEY,
        ActivityCompletionsController.prototype.create,
      ),
    ).toBe(true);
  });
});
