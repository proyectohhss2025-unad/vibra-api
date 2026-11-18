import { jest } from '@jest/globals';
import { ActivitiesService } from './activities.service';

const USER_ID = '507f1f77bcf86cd799439011';
const PARTICIPANT_ID = '507f1f77bcf86cd799439022';
// ObjectIds válidos: getMyHistory descarta ids que no lo sean.
const A1 = '507f1f77bcf86cd7994390a1';
const A2 = '507f1f77bcf86cd7994390a2';
const A3 = '507f1f77bcf86cd7994390a3';
const A4 = '507f1f77bcf86cd7994390a4';
const A5 = '507f1f77bcf86cd7994390a5';
const A6 = '507f1f77bcf86cd7994390a6';
const A7 = '507f1f77bcf86cd7994390a7';
const A8 = '507f1f77bcf86cd7994390a8';
const B1 = '507f1f77bcf86cd7994390b1';
const B2 = '507f1f77bcf86cd7994390b2';
const B3 = '507f1f77bcf86cd7994390b3';
const B4 = '507f1f77bcf86cd7994390b4';

interface BuildOptions {
  activities?: any[];
  responses?: any[];
  completions?: any[];
  participant?: any;
}

/**
 * Mocks mínimos de los modelos que usa ActivitiesService:
 * - activityModel.find(...).populate(...).sort(...).limit(...).exec()
 * - userResponseModel.find(...).select(...).lean().exec()
 * - participantModel.findOne(...).select(...).lean().exec()
 * - activityCompletionModel.find(...).select(...).lean().exec()
 */
const buildService = (options: BuildOptions = {}) => {
  const {
    activities = [],
    responses = [],
    completions = [],
    participant = { _id: PARTICIPANT_ID },
  } = options;

  const execActivities = jest.fn().mockResolvedValue(activities);
  const limit = jest.fn().mockReturnValue({ exec: execActivities });
  const sort = jest.fn().mockReturnValue({ limit });
  const populate = jest.fn().mockReturnValue({ sort, exec: execActivities });
  const findActivities = jest.fn().mockReturnValue({ populate });

  const execResponses = jest.fn().mockResolvedValue(responses);
  const findResponses = jest.fn().mockReturnValue({
    select: () => ({ lean: () => ({ exec: execResponses }) }),
  });

  const execParticipant = jest.fn().mockResolvedValue(participant);
  const findParticipant = jest.fn().mockReturnValue({
    select: () => ({ lean: () => ({ exec: execParticipant }) }),
  });

  const execCompletions = jest.fn().mockResolvedValue(completions);
  const findCompletions = jest.fn().mockReturnValue({
    select: () => ({ lean: () => ({ exec: execCompletions }) }),
  });

  const service = new ActivitiesService(
    { find: findActivities } as any,
    {} as any,
    { find: findResponses } as any,
    { findOne: findParticipant } as any,
    { find: findCompletions } as any,
    { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
    {} as any,
  );

  return { service, findCompletions, findParticipant, findResponses };
};

const activity = (id: string, questions = 2) => ({
  _id: id,
  title: `Actividad ${id}`,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  questions: Array.from({ length: questions }, (_, i) => ({ id: `q${i}` })),
  toObject() {
    const { toObject, ...rest } = this as any;
    return rest;
  },
});

describe('ActivitiesService.getActivityBoard', () => {
  it('marca completada cuando respondió todas las preguntas', async () => {
    const { service } = buildService({
      activities: [activity(A1, 2)],
      responses: [{ activity: A1, score: 80, responses: [{}, {}] }],
    });

    const { activities, counts } = await service.getActivityBoard(USER_ID, {
      type: 'reto',
    });

    expect(activities[0].status).toBe('completada');
    expect(activities[0].completed).toBe(true);
    expect(activities[0].score).toBe(80);
    expect(counts).toEqual({ total: 1, pending: 0, inProgress: 0, completed: 1 });
  });

  it('marca en_progreso cuando respondió sólo algunas preguntas', async () => {
    const { service } = buildService({
      activities: [activity(A2, 3)],
      responses: [{ activity: A2, score: 10, responses: [{}] }],
    });

    const { activities, counts } = await service.getActivityBoard(USER_ID);

    expect(activities[0].status).toBe('en_progreso');
    expect(activities[0].inProgress).toBe(true);
    expect(activities[0].answeredCount).toBe(1);
    expect(counts.inProgress).toBe(1);
  });

  it('marca pendiente cuando no hay respuestas', async () => {
    const { service } = buildService({ activities: [activity(A3, 2)] });

    const { activities, counts } = await service.getActivityBoard(USER_ID);

    expect(activities[0].status).toBe('pendiente');
    expect(activities[0].completed).toBe(false);
    expect(counts.pending).toBe(1);
  });

  it('considera completada una actividad sin preguntas si tiene respuesta', async () => {
    const { service } = buildService({
      activities: [activity(A4, 0)],
      responses: [{ activity: A4, score: 5, responses: [] }],
    });

    const { activities } = await service.getActivityBoard(USER_ID);

    expect(activities[0].status).toBe('completada');
  });

  it('ordena en progreso, luego pendientes, luego completadas', async () => {
    const { service } = buildService({
      activities: [activity(A5, 2), activity(A6, 2), activity(A7, 2)],
      responses: [
        { activity: A5, responses: [{}, {}] },
        { activity: A6, responses: [{}] },
      ],
    });

    const { activities } = await service.getActivityBoard(USER_ID);

    expect(activities.map((a: any) => a.status)).toEqual([
      'en_progreso',
      'pendiente',
      'completada',
    ]);
  });

  it('no consulta respuestas si el userId no es un ObjectId válido', async () => {
    const { service, findResponses } = buildService({
      activities: [activity(A8, 1)],
    });

    await service.getActivityBoard('no-es-objectid');

    expect(findResponses).not.toHaveBeenCalled();
  });
});

describe('ActivitiesService.getMyHistory', () => {
  it('incluye las completaciones de juegos (que no crean UserResponse)', async () => {
    const { service } = buildService({
      activities: [activity(B1, 0)],
      responses: [],
      completions: [
        { activity: B1, achievedScore: 120, completedAt: new Date('2026-05-10T10:00:00Z') },
      ],
    });

    const { items, counts } = await service.getMyHistory(USER_ID);

    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('completada');
    expect(items[0].score).toBe(120);
    expect(counts).toEqual({ total: 1, completed: 1, inProgress: 0 });
  });

  it('cuenta respuestas parciales como en progreso', async () => {
    const { service } = buildService({
      activities: [activity(B2, 3)],
      responses: [{ activity: B2, score: 30, responses: [{}] }],
    });

    const { items, counts } = await service.getMyHistory(USER_ID);

    expect(items[0].status).toBe('en_progreso');
    expect(counts).toEqual({ total: 1, completed: 0, inProgress: 1 });
  });

  it('combina ambas fuentes sin duplicar la actividad', async () => {
    const { service } = buildService({
      activities: [activity(B3, 2)],
      responses: [{ activity: B3, score: 40, responses: [{}, {}] }],
      completions: [
        { activity: B3, achievedScore: 90, completedAt: new Date('2026-05-11T10:00:00Z') },
      ],
    });

    const { items, counts } = await service.getMyHistory(USER_ID);

    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('completada');
    expect(items[0].score).toBe(90);
    expect(counts.total).toBe(1);
  });

  it('devuelve historial vacío si el usuario no tiene participant ni respuestas', async () => {
    const { service } = buildService({
      activities: [activity(B4, 2)],
      responses: [],
      participant: null,
    });

    const { items, counts } = await service.getMyHistory(USER_ID);

    expect(items).toEqual([]);
    expect(counts).toEqual({ total: 0, completed: 0, inProgress: 0 });
  });

  it('no consulta completaciones si el userId es inválido', async () => {
    const { service, findParticipant, findCompletions } = buildService();

    const result = await service.getMyHistory('no-es-objectid');

    expect(findParticipant).not.toHaveBeenCalled();
    expect(findCompletions).not.toHaveBeenCalled();
    expect(result.counts.total).toBe(0);
  });
});

describe('ActivitiesService.getTodaysActivities', () => {
  const buildDailyService = () => {
    const aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });
    const service = new ActivitiesService(
      { aggregate } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
      {} as any,
    );
    return { service, aggregate };
  };

  it('filtra por actividad_diaria cuando no se especifica tipo', async () => {
    const { service, aggregate } = buildDailyService();

    await service.getTodaysActivities();

    const pipeline = aggregate.mock.calls[0][0];
    expect(pipeline[0].$match).toEqual({
      isActive: true,
      type: 'actividad_diaria',
    });
  });

  it('no filtra por tipo cuando se pide type=all', async () => {
    const { service, aggregate } = buildDailyService();

    await service.getTodaysActivities(undefined, { type: 'all' });

    const pipeline = aggregate.mock.calls[0][0];
    expect(pipeline[0].$match).toEqual({ isActive: true });
  });

  it('normaliza el tipo legado actividad_pares a actividad_diaria', async () => {
    const { service, aggregate } = buildDailyService();

    await service.getTodaysActivities(undefined, { type: 'actividad_pares' });

    const pipeline = aggregate.mock.calls[0][0];
    expect(pipeline[0].$match).toEqual({
      isActive: true,
      type: 'actividad_diaria',
    });
  });
});

describe('ActivitiesService.getDailyActivityCoverage', () => {
  const buildCoverageService = (rows: any[] = [], undatedCount = 0) => {
    const aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(rows),
    });
    const countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(undatedCount),
    });
    const service = new ActivitiesService(
      { aggregate, countDocuments } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
      {} as any,
    );
    return { service, aggregate, countDocuments };
  };

  it('devuelve los 7 días del rango sin cobertura cuando no hay actividades', async () => {
    const { service } = buildCoverageService([], 0);

    const result = await service.getDailyActivityCoverage({
      from: '2026-10-26',
      to: '2026-11-01',
    });

    expect(result.days).toHaveLength(7);
    expect(result.summary).toEqual({
      totalDays: 7,
      coveredDays: 0,
      missingDays: 7,
      percentage: 0,
    });
  });

  it('marca como cubierto el día con Actividad Diaria programada', async () => {
    const { service } = buildCoverageService(
      [{ _id: { bogota: '2026-10-28', utc: '2026-10-28' }, count: 2 }],
      0,
    );

    const result = await service.getDailyActivityCoverage({
      from: '2026-10-26',
      to: '2026-11-01',
    });

    const day = result.days.find((item) => item.date === '2026-10-28');
    expect(day?.count).toBe(2);
    expect(day?.covered).toBe(true);
    expect(result.summary.coveredDays).toBe(1);
    expect(result.summary.missingDays).toBe(6);
  });

  it('una Actividad Diaria sin fecha cubre todo el rango', async () => {
    const { service } = buildCoverageService([], 1);

    const result = await service.getDailyActivityCoverage({
      from: '2026-10-26',
      to: '2026-11-01',
    });

    expect(result.undatedCount).toBe(1);
    expect(result.days.every((day) => day.covered)).toBe(true);
    expect(result.summary).toEqual({
      totalDays: 7,
      coveredDays: 7,
      missingDays: 0,
      percentage: 100,
    });
  });

  it('rechaza rangos mayores a 31 días', async () => {
    const { service } = buildCoverageService();

    await expect(
      service.getDailyActivityCoverage({
        from: '2026-01-01',
        to: '2026-03-01',
      }),
    ).rejects.toThrow('El rango no puede superar 31 días');
  });
});
