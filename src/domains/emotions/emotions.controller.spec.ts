import { jest } from '@jest/globals';
import { REQUIRE_AUTHENTICATED_KEY } from 'src/infrastructure/auth/require-authenticated.decorator';
import { EmotionsController } from './emotions.controller';

describe('EmotionsController — catálogo legible con sesión', () => {
  it('el listado exige sesión sin serial', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_AUTHENTICATED_KEY,
        EmotionsController.prototype.findAll,
      ),
    ).toBe(true);
  });

  it('delega el listado al servicio con los filtros recibidos', async () => {
    const service = { findAll: jest.fn(async () => ({ data: [], total: 0 })) };
    const controller = new EmotionsController(service as any);

    await controller.findAll(2, 5, 'active');

    expect(service.findAll).toHaveBeenCalledWith(2, 5, 'active');
  });
});
