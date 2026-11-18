import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ParticipantService } from './participant.service';

/**
 * Pruebas unitarias de identidad y puntos del participante (F6, A-01 y A-02).
 *
 * Lo que garantizan:
 *
 *  1. `/participants/me` entrega el nombre real (`studentName`): antes la app
 *     solo tenía `nickname`, que se creaba con el literal «participante».
 *  2. Los puntos se guardan como enteros: el móvil recibía 3681.4351 y lo
 *     pintaba tal cual.
 *  3. La racha tiene un único dueño y se comporta bien en los cuatro casos:
 *     primera actividad, día consecutivo, hueco de varios días y misma jornada.
 *  4. El récord (`maxStreak`) nunca queda por debajo de la racha actual.
 */

const chainable = (result: any) => {
  const query: any = {};
  for (const method of ['select', 'sort', 'lean', 'populate', 'limit']) {
    query[method] = jest.fn(() => query);
  }
  query.exec = jest.fn(() => Promise.resolve(result));
  return query;
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const buildService = (options: {
  participant?: any;
  user?: any;
} = {}) => {
  const { participant = null, user = null } = options;

  const participantModel: any = {
    findOne: jest.fn(() => chainable(participant)),
    findById: jest.fn(() => Promise.resolve(participant)),
  };

  const userModel: any = {
    findById: jest.fn(() => chainable(user)),
  };

  const service = new ParticipantService(
    participantModel,
    {} as any, // weeklyScheduleModel
    {} as any, // companyModel
    {} as any, // completionModel
    userModel,
  );

  return { service, participantModel, userModel };
};

const participantDocument = (overrides: Record<string, any> = {}) => ({
  _id: 'participant-1',
  userId: 'user-1',
  nickname: 'participante',
  points: 0,
  level: 'bronce',
  currentStreak: 0,
  maxStreak: 0,
  totalActivitiesCompleted: 0,
  lastActivityDate: undefined,
  save: jest.fn(() => Promise.resolve()),
  ...overrides,
});

describe('ParticipantService — identidad', () => {
  it('añade el nombre real del usuario al participante de la sesión', async () => {
    const { service } = buildService({
      participant: { _id: 'p1', userId: 'u1', nickname: 'participante', points: 10 },
      user: {
        _id: 'u1',
        name: 'Andre Suarez',
        username: 'andres',
        email: 'andre@vibra.test',
        avatar: 'a.png',
      },
    });

    const result: any = await service.findByUserId('u1');

    expect(result.studentName).toBe('Andre Suarez');
    expect(result.username).toBe('andres');
    expect(result.email).toBe('andre@vibra.test');
    expect(result.userAvatar).toBe('a.png');
    // El nickname se conserva como respaldo, no se sobrescribe.
    expect(result.nickname).toBe('participante');
  });

  it('no cambia el tipo de userId: sigue siendo el identificador, no el documento', async () => {
    const { service } = buildService({
      participant: { _id: 'p1', userId: 'u1', nickname: 'x' },
      user: { _id: 'u1', name: 'Andre' },
    });

    const result: any = await service.findByUserId('u1');

    expect(result.userId).toBe('u1');
    expect(typeof result.userId).toBe('string');
  });

  it('si el usuario no tiene nombre, studentName queda en null y no rompe', async () => {
    const { service } = buildService({
      participant: { _id: 'p1', userId: 'u1', nickname: 'user-abc123' },
      user: { _id: 'u1' },
    });

    const result: any = await service.findByUserId('u1');

    expect(result.studentName).toBeNull();
    expect(result.username).toBeNull();
  });

  it('lanza NotFound si el usuario no tiene participante', async () => {
    const { service } = buildService({ participant: null });

    await expect(service.findByUserId('u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ParticipantService — puntos enteros (A-02)', () => {
  it('redondea la suma de puntos al guardar', async () => {
    const participant = participantDocument({ points: 3680.9 });
    const { service } = buildService({ participant });

    const result: any = await service.updatePoints('p1', { pointsIncrement: 4.6 } as any);

    expect(Number.isInteger(result.points)).toBe(true);
    expect(participant.points).toBe(3686); // 3685.5 → 3686
  });

  it('un incremento decimal no deja decimales acumulados', async () => {
    const participant = participantDocument({ points: 100 });
    const { service } = buildService({ participant });

    const result: any = await service.updatePoints('p1', { pointsIncrement: 0.5 } as any);

    expect(result.points % 1).toBe(0);
  });

  it('guarda el participante después de actualizar', async () => {
    const participant = participantDocument({ points: 10 });
    const { service } = buildService({ participant });

    await service.updatePoints('p1', { pointsIncrement: 5 } as any);

    expect(participant.save).toHaveBeenCalled();
  });

  it('lanza NotFound si el participante no existe', async () => {
    const { service } = buildService({ participant: null });

    await expect(
      service.updatePoints('p1', { pointsIncrement: 5 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ParticipantService — racha', () => {
  it('la primera actividad arranca la racha en 1', async () => {
    const participant = participantDocument({ currentStreak: 0, lastActivityDate: undefined });
    const { service } = buildService({ participant });

    const result: any = await service.updatePoints('p1', {
      pointsIncrement: 1,
      activityCompleted: true,
    } as any);

    expect(result.currentStreak).toBe(1);
    expect(participant.maxStreak).toBe(1);
  });

  it('un día consecutivo suma 1', async () => {
    const participant = participantDocument({
      currentStreak: 3,
      maxStreak: 3,
      lastActivityDate: daysAgo(1),
    });
    const { service } = buildService({ participant });

    const result: any = await service.updatePoints('p1', {
      pointsIncrement: 1,
      activityCompleted: true,
    } as any);

    expect(result.currentStreak).toBe(4);
    expect(participant.maxStreak).toBe(4);
  });

  it('un hueco de varios días reinicia la racha a 1 pero conserva el récord', async () => {
    const participant = participantDocument({
      currentStreak: 9,
      maxStreak: 9,
      lastActivityDate: daysAgo(5),
    });
    const { service } = buildService({ participant });

    const result: any = await service.updatePoints('p1', {
      pointsIncrement: 1,
      activityCompleted: true,
    } as any);

    expect(result.currentStreak).toBe(1);
    expect(participant.maxStreak).toBe(9);
  });

  it('una segunda actividad el mismo día no infla la racha', async () => {
    const participant = participantDocument({
      currentStreak: 2,
      maxStreak: 2,
      lastActivityDate: daysAgo(0),
    });
    const { service } = buildService({ participant });

    const result: any = await service.updatePoints('p1', {
      pointsIncrement: 1,
      activityCompleted: true,
    } as any);

    expect(result.currentStreak).toBe(2);
  });

  it('sin activityCompleted la racha no se toca', async () => {
    const participant = participantDocument({
      currentStreak: 5,
      maxStreak: 5,
      lastActivityDate: daysAgo(1),
    });
    const { service } = buildService({ participant });

    const result: any = await service.updatePoints('p1', { pointsIncrement: 3 } as any);

    expect(result.currentStreak).toBe(5);
    expect(participant.totalActivitiesCompleted).toBe(0);
  });

  it('el récord nunca queda por debajo de la racha', async () => {
    const participant = participantDocument({
      currentStreak: 4,
      maxStreak: 4,
      lastActivityDate: daysAgo(1),
    });
    const { service } = buildService({ participant });

    await service.updatePoints('p1', {
      pointsIncrement: 1,
      activityCompleted: true,
    } as any);

    expect(participant.maxStreak).toBeGreaterThanOrEqual(participant.currentStreak);
  });
});
