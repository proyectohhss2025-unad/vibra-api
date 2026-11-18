import { jest } from '@jest/globals';
import { REQUIRE_AUTHENTICATED_KEY } from 'src/infrastructure/auth/require-authenticated.decorator';
import { PushNotificationController } from './push-notifications.controller';

describe('PushNotificationController — registro de token', () => {
  const build = () => {
    const service = {
      registerToken: jest.fn(async () => ({ success: true, message: 'ok' })),
    };
    return { service, controller: new PushNotificationController(service as any) };
  };

  it('registra el token con el sub del JWT', async () => {
    const { service, controller } = build();
    const dto = { token: 'ExponentPushToken[abc]', platform: 'android' };

    await controller.register({ user: { sub: 'user-1' } } as any, dto as any);

    expect(service.registerToken).toHaveBeenCalledWith('user-1', dto);
  });

  it('mantiene compatibilidad con tokens que sólo traen userId/_id', async () => {
    const { service, controller } = build();

    await controller.register({ user: { userId: 'legacy-1' } } as any, {
      token: 'ExponentPushToken[abc]',
    } as any);

    expect(service.registerToken).toHaveBeenCalledWith(
      'legacy-1',
      expect.objectContaining({ token: 'ExponentPushToken[abc]' }),
    );
  });

  it('exige sesión sin serial', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_AUTHENTICATED_KEY,
        PushNotificationController.prototype.register,
      ),
    ).toBe(true);
  });
});
