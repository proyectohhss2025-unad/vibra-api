import { jest } from '@jest/globals';
import { REQUIRE_AUTHENTICATED_KEY } from 'src/infrastructure/auth/require-authenticated.decorator';
import { FeedbackController } from './feedback.controller';

describe('FeedbackController — creación desde la sesión', () => {
  const build = () => {
    const service = {
      createFeedback: jest.fn(async (data: any) => data),
    };
    return { service, controller: new FeedbackController(service as any) };
  };

  it('usa el sub del JWT como createdBy', async () => {
    const { service, controller } = build();

    await controller.create({ description: 'sugerencia' } as any, {
      user: { sub: 'user-1' },
    });

    expect(service.createFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'sugerencia', createdBy: 'user-1' }),
    );
  });

  it('cae a "system" si la petición no trae usuario', async () => {
    const { service, controller } = build();

    await controller.create({ description: 'sugerencia' } as any, {} as any);

    expect(service.createFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'system' }),
    );
  });

  it('exige sesión sin serial', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_AUTHENTICATED_KEY,
        FeedbackController.prototype.create,
      ),
    ).toBe(true);
  });
});
