import { jest } from '@jest/globals';
import { JobTypeRegistry } from './job-type-registry.service';

const buildCoverage = (missingDays: number) => {
  const dates = [
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
    '2026-11-07',
    '2026-11-08',
  ];
  const coveredUntil = dates.length - missingDays;
  return {
    from: '2026-11-02',
    to: '2026-11-08',
    days: dates.map((date, index) => ({
      date,
      count: index < coveredUntil ? 1 : 0,
      covered: index < coveredUntil,
    })),
    summary: {
      totalDays: dates.length,
      coveredDays: coveredUntil,
      missingDays,
      percentage: Math.round((coveredUntil / dates.length) * 100),
    },
    undatedCount: 0,
  };
};

const buildRegistry = (coverage: any) => {
  const createSystemNotificationsForRoles = jest.fn().mockResolvedValue({
    created: 3,
    existing: 0,
    recipients: ['user-1', 'user-2', 'user-3'],
  });
  const sendPushToUsers = jest.fn().mockResolvedValue({
    success: true,
    sent: 3,
    failed: 0,
    deactivated: 0,
    skipped: 0,
    tokens: 3,
    users: 3,
  });
  const record = jest.fn().mockResolvedValue({ _id: 'stat-1' });
  const registry = new JobTypeRegistry(
    {} as any,
    {
      getDailyActivityCoverage: jest.fn().mockResolvedValue(coverage),
    } as any,
    {} as any,
    { createSystemNotificationsForRoles } as any,
    { sendPushToUsers } as any,
    { record } as any,
  );
  return {
    registry,
    createSystemNotificationsForRoles,
    sendPushToUsers,
    record,
  };
};

describe('JobTypeRegistry.CHECK_DAILY_COVERAGE', () => {
  it('crea notificaciones dirigidas y envía push cuando faltan días', async () => {
    const {
      registry,
      createSystemNotificationsForRoles,
      sendPushToUsers,
      record,
    } = buildRegistry(buildCoverage(2));

    const result = await registry.execute('CHECK_DAILY_COVERAGE', {
      weeksAhead: 1,
      notify: true,
    });

    expect(result.success).toBe(true);
    expect(createSystemNotificationsForRoles).toHaveBeenCalledTimes(1);
    const payload = createSystemNotificationsForRoles.mock.calls[0][0];
    expect(payload.roles).toEqual([
      'Super Admin',
      'Administrador',
      'Docente',
    ]);
    expect(payload.title).toBe('Cobertura de Actividad Diaria incompleta');
    expect(payload.message).toContain('2 días sin Actividad Diaria');
    expect(payload.event).toMatch(/^DAILY_COVERAGE:/);
    expect(payload.action).toBe('OPEN_DAILY_ACTIVITIES');
    expect(payload.actionLabel).toBe('Ver actividades diarias');
    expect(payload.metadata).toMatchObject({ type: 'actividad_diaria' });

    expect(sendPushToUsers).toHaveBeenCalledTimes(1);
    const pushArgs = sendPushToUsers.mock.calls[0];
    expect(pushArgs[0]).toEqual(['user-1', 'user-2', 'user-3']);
    expect(pushArgs[1]).toBe('Cobertura de Actividad Diaria incompleta');
    expect(pushArgs[2]).toContain('2 días sin Actividad Diaria');
    expect(pushArgs[3]).toMatchObject({
      type: 'daily_coverage',
      action: 'OPEN_DAILY_ACTIVITIES',
      webUrl: '/activity/activity-table?type=actividad_diaria',
    });
    expect(result.output.pushResult).toEqual({
      success: true,
      sent: 3,
      failed: 0,
      deactivated: 0,
      skipped: 0,
      tokens: 3,
      users: 3,
    });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toMatchObject({
      jobType: 'CHECK_DAILY_COVERAGE',
      event: expect.stringMatching(/^DAILY_COVERAGE:/),
      source: 'job',
      result: {
        sent: 3,
        failed: 0,
        deactivated: 0,
        skipped: 0,
        tokens: 3,
        users: 3,
      },
      metadata: {
        roles: ['Super Admin', 'Administrador', 'Docente'],
      },
    });
    expect(result.output.deliveryStatId).toBe('stat-1');
  });

  it('no crea notificación ni push cuando la cobertura está completa', async () => {
    const {
      registry,
      createSystemNotificationsForRoles,
      sendPushToUsers,
      record,
    } = buildRegistry(buildCoverage(0));

    const result = await registry.execute('CHECK_DAILY_COVERAGE', {
      weeksAhead: 1,
      notify: true,
    });

    expect(result.success).toBe(true);
    expect(createSystemNotificationsForRoles).not.toHaveBeenCalled();
    expect(sendPushToUsers).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('no crea notificación ni push cuando notify=false', async () => {
    const {
      registry,
      createSystemNotificationsForRoles,
      sendPushToUsers,
      record,
    } = buildRegistry(buildCoverage(2));

    await registry.execute('CHECK_DAILY_COVERAGE', {
      weeksAhead: 1,
      notify: false,
    });

    expect(createSystemNotificationsForRoles).not.toHaveBeenCalled();
    expect(sendPushToUsers).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('no envía push si no hay destinatarios, pero registra métrica', async () => {
    const {
      registry,
      createSystemNotificationsForRoles,
      sendPushToUsers,
      record,
    } = buildRegistry(buildCoverage(2));
    createSystemNotificationsForRoles.mockResolvedValue({
      created: 0,
      existing: 0,
      recipients: [],
    });

    const result = await registry.execute('CHECK_DAILY_COVERAGE', {
      weeksAhead: 1,
      notify: true,
    });

    expect(result.success).toBe(true);
    expect(sendPushToUsers).not.toHaveBeenCalled();
    expect(result.output.pushResult).toEqual({
      success: true,
      sent: 0,
      failed: 0,
      deactivated: 0,
      skipped: 0,
      tokens: 0,
      users: 0,
    });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0].result).toMatchObject({
      sent: 0,
      failed: 0,
      deactivated: 0,
      tokens: 0,
      users: 0,
    });
    expect(result.output.deliveryStatId).toBe('stat-1');
  });

  it('un fallo de push no marca el job como fallido y registra métrica en cero', async () => {
    const { registry, sendPushToUsers, record } = buildRegistry(
      buildCoverage(2),
    );
    sendPushToUsers.mockRejectedValue(new Error('Expo caído'));

    const result = await registry.execute('CHECK_DAILY_COVERAGE', {
      weeksAhead: 1,
      notify: true,
    });

    expect(result.success).toBe(true);
    expect(result.output.pushResult).toEqual({
      success: true,
      sent: 0,
      failed: 0,
      deactivated: 0,
      skipped: 0,
      tokens: 0,
      users: 0,
    });
    expect(record).toHaveBeenCalledTimes(1);
    expect(result.output.deliveryStatId).toBe('stat-1');
  });

  it('un fallo al persistir la métrica no marca el job como fallido', async () => {
    const { registry, record } = buildRegistry(buildCoverage(2));
    record.mockRejectedValue(new Error('Colección caída'));

    const result = await registry.execute('CHECK_DAILY_COVERAGE', {
      weeksAhead: 1,
      notify: true,
    });

    expect(result.success).toBe(true);
    expect(result.output.deliveryStatId).toBeNull();
  });
});
