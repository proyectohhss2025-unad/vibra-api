import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { ReportsService } from './reports.service';

/**
 * Pruebas unitarias de las métricas de reportes (F3 del plan del 4-nov-2026).
 *
 * Lo que garantizan:
 *
 *  1. El promedio de Puntajes lo calcula el servidor con el mismo filtro que la
 *     distribución: antes la web lo derivaba de los puntos medios de cada rango
 *     (`low + 10`) y daba 11,1 donde Panorama daba 7,8.
 *  2. `activityId` se compara como ObjectId: con un string la consulta devolvía
 *     siempre vacío.
 *  3. Los filtros `courseId` y `userId` se aplican de verdad (el DTO los aceptaba
 *     y ningún pipeline los leía).
 *  4. «Actividades» cuenta las que tienen respuestas DENTRO del filtro, y el
 *     catálogo histórico se expone aparte.
 */

const objectId = (hex: string) => new Types.ObjectId(hex);

const COURSE_ID = '65f1a2b3c4d5e6f700000001';
const USER_ID = '65f1a2b3c4d5e6f7000000a1';
const OTHER_USER_ID = '65f1a2b3c4d5e6f7000000a2';
const ACTIVITY_ID = '65f1a2b3c4d5e6f7000000c1';

const chainable = (result: any) => {
  const query: any = {};
  for (const method of ['select', 'sort', 'lean', 'populate', 'limit', 'skip']) {
    query[method] = jest.fn(() => query);
  }
  query.exec = jest.fn(() => Promise.resolve(result));
  return query;
};

const buildService = (options: {
  buckets?: any[];
  stats?: any;
  enrolledUsers?: Types.ObjectId[];
  activitiesWithResponses?: any[];
  totalResponses?: number;
  todayResponses?: number;
  activeActivitiesCatalog?: number;
} = {}) => {
  const {
    buckets = [],
    stats = [],
    enrolledUsers = [],
    activitiesWithResponses = [],
    totalResponses = 0,
    todayResponses = 0,
    activeActivitiesCatalog = 0,
  } = options;

  const aggregateCalls: any[] = [];
  const userResponseModel: any = {
    aggregate: jest.fn((pipeline: any[]) => {
      aggregateCalls.push(pipeline);
      const isBucket = pipeline.some((stage) => stage.$bucket);
      return Promise.resolve(isBucket ? buckets : stats);
    }),
    distinct: jest.fn(() => chainable(activitiesWithResponses)),
    countDocuments: jest.fn((filter: any) =>
      Promise.resolve(
        filter?.startTime ? todayResponses : totalResponses,
      ),
    ),
  };

  const enrollmentModel: any = {
    find: jest.fn(() => chainable(enrolledUsers.map((userId) => ({ userId })))),
  };

  const activityModel: any = {
    find: jest.fn(() => chainable([])),
    countDocuments: jest.fn(() => Promise.resolve(activeActivitiesCatalog)),
  };

  const service = new ReportsService(
    activityModel,
    userResponseModel,
    {} as any, // emotionModel
    {} as any, // participantModel
    {} as any, // userModel
    enrollmentModel,
  );

  return { service, userResponseModel, enrollmentModel, activityModel, aggregateCalls };
};

describe('ReportsService — distribución de puntajes', () => {
  it('devuelve el promedio calculado por el servidor, no uno derivado de los rangos', async () => {
    const { service } = buildService({
      buckets: [
        { _id: 0, count: 2 },
        { _id: 20, count: 6 },
      ],
      stats: [{ avgScore: 7.84, totalResponses: 8, maxScore: 38 }],
    });

    const report = await service.getScores({});

    expect(report.totalResponses).toBe(8);
    expect(report.avgScore).toBe(7.8);
    expect(report.maxScore).toBe(38);
    // El promedio de los puntos medios de rango sería otro número (11,1).
    expect(report.avgScore).not.toBe(11.1);
  });

  it('etiqueta los rangos y calcula el porcentaje sobre el total', async () => {
    const { service } = buildService({
      buckets: [
        { _id: 0, count: 3 },
        { _id: 60, count: 1 },
        { _id: '100+', count: 0 },
      ],
      stats: [{ avgScore: 10, totalResponses: 4, maxScore: 64 }],
    });

    const report = await service.getScores({});

    expect(report.buckets).toEqual([
      { range: '0-19', count: 3, percentage: 75 },
      { range: '60-79', count: 1, percentage: 25 },
      { range: '100', count: 0, percentage: 0 },
    ]);
  });

  it('sin respuestas devuelve ceros y no NaN', async () => {
    const { service } = buildService({ buckets: [], stats: [] });

    const report = await service.getScores({});

    expect(report.totalResponses).toBe(0);
    expect(report.avgScore).toBe(0);
    expect(Number.isNaN(report.avgScore)).toBe(false);
  });

  it('compara activityId como ObjectId, no como string', async () => {
    const { service, aggregateCalls } = buildService();

    await service.getScores({ activityId: ACTIVITY_ID });

    const [firstPipeline] = aggregateCalls;
    const match = firstPipeline[0].$match;
    expect(match.activity).toBeInstanceOf(Types.ObjectId);
    expect(match.activity.toString()).toBe(ACTIVITY_ID);
  });

  it('con activityId inválido fuerza un resultado vacío en vez de comparar basura', async () => {
    const { service, aggregateCalls } = buildService();

    await service.getScores({ activityId: 'no-es-un-id' });

    const match = aggregateCalls[0][0].$match;
    expect(match.activity).toEqual({ $in: [] });
  });
});

describe('ReportsService — filtros que antes se ignoraban', () => {
  it('filtra por usuario concreto', async () => {
    const { service, aggregateCalls } = buildService();

    await service.getScores({ userId: USER_ID });

    const match = aggregateCalls[0][0].$match;
    expect(match.user).toBeInstanceOf(Types.ObjectId);
    expect(match.user.toString()).toBe(USER_ID);
  });

  it('filtra por curso resolviendo los inscritos', async () => {
    const enrolled = [objectId(USER_ID), objectId(OTHER_USER_ID)];
    const { service, aggregateCalls, enrollmentModel } = buildService({
      enrolledUsers: enrolled,
    });

    await service.getScores({ courseId: COURSE_ID });

    expect(enrollmentModel.find).toHaveBeenCalled();
    const [filter] = enrollmentModel.find.mock.calls[0] as any[];
    expect(filter.courseId).toBeInstanceOf(Types.ObjectId);
    expect(filter.status.$in).toEqual(['activo', 'completado']);

    const match = aggregateCalls[0][0].$match;
    expect(match.user.$in).toEqual(enrolled);
  });

  it('cruza curso y usuario: devuelve el usuario solo si está inscrito', async () => {
    const { service, aggregateCalls } = buildService({
      enrolledUsers: [objectId(OTHER_USER_ID)],
    });

    await service.getScores({ courseId: COURSE_ID, userId: USER_ID });

    const match = aggregateCalls[0][0].$match;
    expect(match.user.$in).toEqual([]);
  });

  it('no consulta matrículas cuando no se filtra por curso', async () => {
    const { service, enrollmentModel } = buildService();

    await service.getScores({});

    expect(enrollmentModel.find).not.toHaveBeenCalled();
  });
});

describe('ReportsService — KPI', () => {
  it('cuenta como «actividades» las que tienen respuestas dentro del filtro', async () => {
    const activities = [objectId(ACTIVITY_ID), objectId('65f1a2b3c4d5e6f7000000c2')];
    const { service } = buildService({
      activitiesWithResponses: activities,
      activeActivitiesCatalog: 43,
      totalResponses: 53,
      stats: [{ totalResponses: 53, uniqueUsers: 5, avgScore: 7.8, avgTime: 1200000, totalScore: 413 }],
    });

    const kpi = await service.getKpi({});

    expect(kpi.activeActivities).toBe(2);
    // El catálogo histórico va aparte: es la cifra que confundía la pantalla.
    expect(kpi.totalActiveActivities).toBe(43);
    expect(kpi.totalResponses).toBe(53);
  });

  it('el número de actividades nunca supera al de respuestas del mismo periodo', async () => {
    const { service } = buildService({
      activitiesWithResponses: [objectId(ACTIVITY_ID)],
      totalResponses: 1,
      stats: [{ totalResponses: 1, uniqueUsers: 1, avgScore: 5, avgTime: 60000, totalScore: 5 }],
    });

    const kpi = await service.getKpi({});

    expect(kpi.activeActivities).toBeLessThanOrEqual(kpi.totalResponses);
  });

  it('sin datos devuelve ceros, no undefined', async () => {
    const { service } = buildService({ stats: [] });

    const kpi = await service.getKpi({});

    expect(kpi.totalResponses).toBe(0);
    expect(kpi.avgScore).toBe(0);
    expect(kpi.activeActivities).toBe(0);
    expect(kpi.todayResponses).toBe(0);
  });
});
