import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { ParticipantService } from './participant.service';

/**
 * Pruebas unitarias del historial de 30 días (A-05).
 *
 * El defecto: el gráfico «Actividades completadas» se alimentaba de
 * `weeklySchedule.days[].status` —el calendario PLANIFICADO— en lugar de los
 * registros de actividad entregada. Con la programación sin marcar, el gráfico
 * aparecía vacío aunque el participante tuviera decenas de actividades hechas.
 *
 * La fuente correcta es `activitycompletions`, por `participant` y `completedAt`.
 */

const PARTICIPANT_ID = '65f1a2b3c4d5e6f700000001';

const chainable = (result: any) => {
  const query: any = {};
  for (const method of ['select', 'sort', 'lean', 'populate', 'limit']) {
    query[method] = jest.fn(() => query);
  }
  query.exec = jest.fn(() => Promise.resolve(result));
  return query;
};

const buildService = (options: {
  participant?: any;
  history?: any[];
} = {}) => {
  const {
    participant = { _id: PARTICIPANT_ID, userId: 'user-1', nickname: 'x' },
    history = [],
  } = options;

  const participantModel: any = {
    // `getActivityHistory` hace `await findById(...)` sin encadenar, así que
    // debe devolver una promesa y no un objeto encadenable.
    findById: jest.fn(() => Promise.resolve(participant)),
    findOne: jest.fn(() => chainable(participant)),
  };

  const weeklyScheduleModel: any = { aggregate: jest.fn(() => Promise.resolve([])) };

  const completionModel: any = {
    aggregate: jest.fn(() => Promise.resolve(history)),
  };

  const service = new ParticipantService(
    participantModel,
    weeklyScheduleModel,
    {} as any,
    completionModel,
    {} as any,
  );

  return { service, completionModel, weeklyScheduleModel };
};

const localDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

describe('ParticipantService — historial de actividad (A-05)', () => {
  it('cuenta las actividades entregadas, no el calendario planificado', async () => {
    const { service, completionModel, weeklyScheduleModel } = buildService();

    await service.getActivityHistory(PARTICIPANT_ID, 7);

    expect(completionModel.aggregate).toHaveBeenCalled();
    // La regresión que se quiere evitar: volver a leer el calendario.
    expect(weeklyScheduleModel.aggregate).not.toHaveBeenCalled();
  });

  it('filtra por participante y por fecha de corte', async () => {
    const { service, completionModel } = buildService();

    await service.getActivityHistory(PARTICIPANT_ID, 7);

    const [pipeline] = completionModel.aggregate.mock.calls[0] as any[];
    const match = pipeline[0].$match;
    expect(match.participant).toBeInstanceOf(Types.ObjectId);
    expect(match.participant.toString()).toBe(PARTICIPANT_ID);
    expect(match.completedAt.$gte).toBeInstanceOf(Date);
  });

  it('devuelve un punto por día, incluidos los que no tienen actividad', async () => {
    const { service } = buildService({
      history: [{ date: localDate(1), count: 3 }],
    });

    const { history } = await service.getActivityHistory(PARTICIPANT_ID, 7);

    // 7 días hacia atrás + hoy
    expect(history).toHaveLength(8);
    expect(history.every((entry) => typeof entry.count === 'number')).toBe(true);
  });

  it('coloca el conteo en su día y deja el resto en cero', async () => {
    const { service } = buildService({
      history: [
        { date: localDate(0), count: 2 },
        { date: localDate(1), count: 5 },
      ],
    });

    const { history } = await service.getActivityHistory(PARTICIPANT_ID, 7);

    const hoy = history.find((entry) => entry.date === localDate(0));
    const ayer = history.find((entry) => entry.date === localDate(1));
    const anteayer = history.find((entry) => entry.date === localDate(2));

    expect(hoy?.count).toBe(2);
    expect(ayer?.count).toBe(5);
    expect(anteayer?.count).toBe(0);
  });

  it('los días vienen ordenados y sin repetir', async () => {
    const { service } = buildService();

    const { history } = await service.getActivityHistory(PARTICIPANT_ID, 7);

    const dates = history.map((entry) => entry.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('un historial vacío sigue devolviendo la serie completa en cero', async () => {
    const { service } = buildService({ history: [] });

    const { history } = await service.getActivityHistory(PARTICIPANT_ID, 7);

    expect(history).toHaveLength(8);
    expect(history.every((entry) => entry.count === 0)).toBe(true);
  });

  it('lanza NotFound si el participante no existe', async () => {
    const { service } = buildService({ participant: null });

    await expect(service.getActivityHistory(PARTICIPANT_ID, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
