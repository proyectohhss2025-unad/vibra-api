import { jest } from '@jest/globals';

// Bajo módulos ES `jest.mock` no se eleva por encima de los `import` estáticos,
// así que el módulo real se cargaba antes de registrar el doble y la prueba
// invocaba de verdad `web-push.setVapidDetails` (fallaba validando la clave
// VAPID de prueba). El patrón correcto en ESM es `jest.unstable_mockModule`
// con `import()` dinámico después.
jest.unstable_mockModule('web-push', () => ({
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
    generateVAPIDKeys: jest.fn(),
  },
}));

// El servicio importa `web-push` por defecto, así que el doble expone `default`.
const webPush = (await import('web-push')).default as unknown as {
  setVapidDetails: jest.Mock;
  sendNotification: jest.Mock;
};

const { PushNotificationService } = await import(
  './push-notifications.service'
);

const originalFetch = global.fetch;
const originalVapid = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT,
};

const setVapidEnv = (enabled: boolean) => {
  if (enabled) {
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_SUBJECT = 'mailto:test@vibra.com';
  } else {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  }
};

const restoreVapidEnv = () => {
  for (const [key, value] of Object.entries({
    VAPID_PUBLIC_KEY: originalVapid.publicKey,
    VAPID_PRIVATE_KEY: originalVapid.privateKey,
    VAPID_SUBJECT: originalVapid.subject,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

const buildService = (tokens: any[] = [], vapid = false) => {
  setVapidEnv(vapid);

  const exec = jest.fn().mockResolvedValue(tokens);
  const lean = jest.fn().mockReturnValue({ exec });
  const find = jest.fn().mockReturnValue({ lean });

  const findOneAndUpdateExec = jest.fn().mockResolvedValue({});
  const findOneAndUpdate = jest.fn().mockReturnValue({
    exec: findOneAndUpdateExec,
  });

  const aggregateExec = jest.fn().mockResolvedValue([]);
  const aggregate = jest.fn().mockReturnValue({ exec: aggregateExec });

  const logger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const service = new PushNotificationService(
    { find, findOneAndUpdate, aggregate } as any,
    logger as any,
  );

  return {
    service,
    find,
    findOneAndUpdate,
    aggregate,
    aggregateExec,
    logger,
  };
};

const mockFetchSuccess = () => {
  global.fetch = jest.fn().mockImplementation(async (_url, options: any) => {
    const chunk = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        data: chunk.map(() => ({ status: 'ok' })),
      }),
    };
  }) as any;
};

const webSubscription = {
  endpoint: 'https://push.example.com/subscription/123',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

const webToken = {
  token: JSON.stringify(webSubscription),
  platform: 'web',
};

const emptyMetrics = {
  success: true,
  sent: 0,
  failed: 0,
  deactivated: 0,
  skipped: 0,
  tokens: 0,
  users: 0,
};

describe('PushNotificationService', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    restoreVapidEnv();
    jest.clearAllMocks();
  });

  it('envía push a varios usuarios, de-duplica ids y reporta métricas', async () => {
    const { service, find } = buildService([
      { token: 'ExponentPushToken[a]' },
      { token: 'ExponentPushToken[b]' },
    ]);
    mockFetchSuccess();

    const result = await service.sendPushToUsers(
      ['user-1', 'user-2', 'user-1'],
      'Cobertura incompleta',
      'Faltan días de Actividad Diaria',
      { type: 'daily_coverage' },
    );

    expect(find).toHaveBeenCalledWith({
      userId: { $in: ['user-1', 'user-2'] },
      isActive: true,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const messages = JSON.parse(options.body);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      to: 'ExponentPushToken[a]',
      sound: 'default',
      title: 'Cobertura incompleta',
      body: 'Faltan días de Actividad Diaria',
      data: { type: 'daily_coverage' },
    });
    expect(result).toEqual({
      success: true,
      sent: 2,
      failed: 0,
      deactivated: 0,
      skipped: 0,
      tokens: 2,
      users: 2,
    });
  });

  it('no consulta ni envía si no hay ids de usuario', async () => {
    const { service, find } = buildService([]);
    global.fetch = jest.fn() as any;

    const result = await service.sendPushToUsers([], 'Título', 'Cuerpo');

    expect(find).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual(emptyMetrics);
  });

  it('no envía si los usuarios no tienen tokens activos', async () => {
    const { service, find } = buildService([]);
    global.fetch = jest.fn() as any;

    const result = await service.sendPushToUsers(['user-1'], 'Título', 'Cuerpo');

    expect(find).toHaveBeenCalledWith({
      userId: { $in: ['user-1'] },
      isActive: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({ ...emptyMetrics, users: 1 });
  });

  it('envía a un solo usuario con sendPushToUser', async () => {
    const { service, find } = buildService([
      { token: 'ExponentPushToken[user-1]' },
    ]);
    mockFetchSuccess();

    const result = await service.sendPushToUser(
      'user-1',
      'Título',
      'Cuerpo',
    );

    expect(find).toHaveBeenCalledWith({ userId: 'user-1', isActive: true });
    expect(result).toEqual({
      success: true,
      sent: 1,
      failed: 0,
      deactivated: 0,
      skipped: 0,
      tokens: 1,
      users: 1,
    });
  });

  it('divide en chunks de 100 mensajes Expo', async () => {
    const tokens = Array.from({ length: 101 }, (_, index) => ({
      token: `ExponentPushToken[${index}]`,
    }));
    const { service } = buildService(tokens);
    mockFetchSuccess();

    const result = await service.sendPushToUsers(
      ['user-1'],
      'Título',
      'Cuerpo',
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(101);
    expect(result.tokens).toBe(101);
    expect(result.failed).toBe(0);
  });

  it('desactiva el token Expo cuando DeviceNotRegistered y cuenta el fallo', async () => {
    const { service, findOneAndUpdate } = buildService([
      { token: 'bad-token' },
    ]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ status: 'error', message: 'DeviceNotRegistered' }],
      }),
    }) as any;

    const result = await service.sendPushToUsers(
      ['user-1'],
      'Título',
      'Cuerpo',
    );

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { token: 'bad-token' },
      {
        $set: expect.objectContaining({
          isActive: false,
          deactivationReason: 'DeviceNotRegistered',
        }),
      },
    );
    expect(result).toMatchObject({
      sent: 0,
      failed: 1,
      deactivated: 1,
      tokens: 1,
      users: 1,
    });
  });

  it('envía Web Push a una suscripción PWA', async () => {
    const { service } = buildService([webToken], true);
    (webPush.sendNotification as jest.Mock).mockResolvedValue({
      statusCode: 201,
    });

    const result = await service.sendPushToUsers(
      ['admin-1'],
      'Cobertura incompleta',
      'Faltan 2 días',
      { type: 'daily_coverage' },
    );

    expect(webPush.sendNotification).toHaveBeenCalledTimes(1);
    const [subscription, payload, options] = (
      webPush.sendNotification as jest.Mock
    ).mock.calls[0];
    expect(subscription).toEqual(webSubscription);
    expect(JSON.parse(payload)).toMatchObject({
      title: 'Cobertura incompleta',
      body: 'Faltan 2 días',
      data: { type: 'daily_coverage' },
    });
    expect(options).toMatchObject({ TTL: 60 * 60 * 24 });
    expect(result).toEqual({
      success: true,
      sent: 1,
      failed: 0,
      deactivated: 0,
      skipped: 0,
      tokens: 1,
      users: 1,
    });
  });

  it('desactiva una suscripción Web Push expirada (410) y cuenta el fallo', async () => {
    const { service, findOneAndUpdate } = buildService([webToken], true);
    (webPush.sendNotification as jest.Mock).mockRejectedValue({
      statusCode: 410,
    });

    const result = await service.sendPushToUsers(
      ['admin-1'],
      'Título',
      'Cuerpo',
    );

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { token: webToken.token },
      {
        $set: expect.objectContaining({
          isActive: false,
          deactivationReason: 'expired_subscription',
        }),
      },
    );
    expect(result).toMatchObject({
      sent: 0,
      failed: 1,
      deactivated: 1,
      skipped: 0,
      tokens: 1,
      users: 1,
    });
  });

  it('omite Web Push y lo reporta como skipped si VAPID no está configurado', async () => {
    const { service, logger } = buildService([webToken], false);
    (webPush.sendNotification as jest.Mock).mockResolvedValue({});

    const result = await service.sendPushToUsers(
      ['admin-1'],
      'Título',
      'Cuerpo',
    );

    expect(webPush.sendNotification).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      sent: 0,
      failed: 0,
      deactivated: 0,
      skipped: 1,
      tokens: 1,
      users: 1,
    });
  });

  it('reactiva un token y limpia la desactivación al registrarlo', async () => {
    const { service, findOneAndUpdate } = buildService([]);

    await service.registerToken('user-1', {
      token: 'ExponentPushToken[re]',
      platform: 'web',
    });

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { token: 'ExponentPushToken[re]' },
      {
        token: 'ExponentPushToken[re]',
        userId: 'user-1',
        platform: 'web',
        isActive: true,
        deactivatedAt: null,
        deactivationReason: null,
      },
      { upsert: true, new: true },
    );
  });

  it('resume la salud de tokens por plataforma y bajas recientes', async () => {
    const { service, aggregateExec } = buildService([], false);
    aggregateExec.mockResolvedValue([
      {
        byPlatform: [
          { _id: { platform: 'android', isActive: true }, count: 4 },
          { _id: { platform: 'android', isActive: false }, count: 1 },
          { _id: { platform: 'web', isActive: true }, count: 2 },
        ],
        deactivatedLast7Days: [{ count: 3 }],
        recentDeactivations: [
          {
            platform: 'web',
            deactivationReason: 'expired_subscription',
            deactivatedAt: new Date('2026-10-20T00:00:00Z'),
          },
        ],
      },
    ]);

    const health = await service.getDeliveryHealth(true);

    expect(health.activeTokens).toBe(6);
    expect(health.inactiveTokens).toBe(1);
    expect(health.totalTokens).toBe(7);
    expect(health.deactivatedLast7Days).toBe(3);
    expect(health.platforms).toEqual([
      { platform: 'android', active: 4, inactive: 1, total: 5 },
      { platform: 'ios', active: 0, inactive: 0, total: 0 },
      { platform: 'web', active: 2, inactive: 0, total: 2 },
    ]);
    expect(health.recentDeactivations[0]).toMatchObject({
      platform: 'web',
      reason: 'expired_subscription',
    });
  });

  it('expone la clave pública VAPID configurada', () => {
    const { service } = buildService([], true);

    expect(service.getVapidPublicKey()).toBe('test-public-key');
  });
});
