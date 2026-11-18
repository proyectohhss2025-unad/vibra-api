import { jest } from '@jest/globals';
import { PushDeliveryStatsService } from './push-delivery-stats.service';

const buildService = () => {
  const create = jest.fn().mockResolvedValue({ _id: 'stat-1' });
  const aggregateExec = jest.fn().mockResolvedValue([{}]);
  const aggregate = jest.fn().mockReturnValue({ exec: aggregateExec });

  const service = new PushDeliveryStatsService({
    create,
    aggregate,
  } as any);

  return { service, create, aggregate, aggregateExec };
};

const sampleResult = {
  success: true,
  sent: 8,
  failed: 2,
  deactivated: 1,
  skipped: 1,
  tokens: 10,
  users: 3,
};

const sampleFacet = {
  trend: [
    {
      weekStart: new Date('2026-10-26T00:00:00.000Z'),
      sent: 8,
      failed: 2,
      deactivated: 1,
      skipped: 1,
      tokens: 10,
      users: 3,
      runs: 1,
    },
  ],
  summary: [
    {
      sent: 8,
      failed: 2,
      deactivated: 1,
      skipped: 1,
      tokens: 10,
      users: 3,
      runs: 1,
    },
  ],
  lastRun: [
    {
      jobType: 'CHECK_DAILY_COVERAGE',
      event: 'DAILY_COVERAGE:2026-11-02',
      source: 'job',
      sent: 8,
      failed: 2,
      deactivated: 1,
      skipped: 1,
      tokens: 10,
      users: 3,
      createdAt: new Date('2026-10-30T15:00:00.000Z'),
    },
  ],
};

describe('PushDeliveryStatsService', () => {
  it('registra una ejecución con todas las métricas', async () => {
    const { service, create } = buildService();

    await service.record({
      jobType: 'CHECK_DAILY_COVERAGE',
      event: 'DAILY_COVERAGE:2026-11-02',
      source: 'job',
      result: sampleResult,
      metadata: { roles: ['Administrador'] },
    });

    expect(create).toHaveBeenCalledWith({
      jobType: 'CHECK_DAILY_COVERAGE',
      event: 'DAILY_COVERAGE:2026-11-02',
      source: 'job',
      sent: 8,
      failed: 2,
      deactivated: 1,
      skipped: 1,
      tokens: 10,
      users: 3,
      metadata: { roles: ['Administrador'] },
    });
  });

  it('mapea la tendencia, el resumen y la última ejecución', async () => {
    const { service, aggregateExec } = buildService();
    aggregateExec.mockResolvedValue([sampleFacet]);

    const stats = await service.getStats({ weeks: 8, force: true });

    expect(stats.weeks).toBe(8);
    expect(stats.summary).toMatchObject({
      sent: 8,
      failed: 2,
      deactivated: 1,
      skipped: 1,
      tokens: 10,
      users: 3,
      runs: 1,
      failureRate: 20,
      deactivationRate: 10,
    });
    expect(stats.trend).toHaveLength(1);
    expect(stats.trend[0]).toMatchObject({
      sent: 8,
      failed: 2,
      deactivated: 1,
      runs: 1,
    });
    expect(stats.lastRun).toMatchObject({
      jobType: 'CHECK_DAILY_COVERAGE',
      event: 'DAILY_COVERAGE:2026-11-02',
      source: 'job',
    });
  });

  it('devuelve un resumen vacío cuando no hay registros', async () => {
    const { service, aggregateExec } = buildService();
    aggregateExec.mockResolvedValue([{}]);

    const stats = await service.getStats({ force: true });

    expect(stats.summary).toEqual({
      sent: 0,
      failed: 0,
      deactivated: 0,
      skipped: 0,
      tokens: 0,
      users: 0,
      runs: 0,
      failureRate: 0,
      deactivationRate: 0,
    });
    expect(stats.trend).toEqual([]);
    expect(stats.lastRun).toBeNull();
  });

  it('usa caché de 60s y la invalida al registrar', async () => {
    const { service, create, aggregate, aggregateExec } = buildService();
    aggregateExec.mockResolvedValue([sampleFacet]);

    await service.getStats();
    await service.getStats();
    expect(aggregate).toHaveBeenCalledTimes(1);

    await service.record({
      jobType: 'CHECK_DAILY_COVERAGE',
      result: sampleResult,
    });
    await service.getStats();
    expect(aggregate).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('fuerza el recálculo con force=true', async () => {
    const { service, aggregate, aggregateExec } = buildService();
    aggregateExec.mockResolvedValue([sampleFacet]);

    await service.getStats();
    await service.getStats({ force: true });

    expect(aggregate).toHaveBeenCalledTimes(2);
  });

  it('acota las semanas al rango 1-52', async () => {
    const { service, aggregateExec } = buildService();
    aggregateExec.mockResolvedValue([sampleFacet]);

    const stats = await service.getStats({ weeks: 999, force: true });

    expect(stats.weeks).toBe(52);
  });
});
