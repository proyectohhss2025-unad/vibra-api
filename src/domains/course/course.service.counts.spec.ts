import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CourseService } from './course.service';

/**
 * Pruebas unitarias de la fuente única de verdad de «estudiante inscrito».
 *
 * Lo que garantizan (F2 del plan de ajustes del 4-nov-2026):
 *
 *  1. Un curso con inscritos da el MISMO número en todas las vistas.
 *  2. `retirado` no cuenta como inscrito.
 *  3. Quien está inscrito sin actividad se cuenta como inscrito, no como activo.
 *  4. Las tasas se calculan sobre inscritos y no dividen por cero.
 *  5. El promedio de puntos se divide por inscritos, no solo por quienes tienen
 *     documento de participante (si no, la media se infla).
 *  6. El campo de usuario en las respuestas es `user`, NO `userId`. Fue el
 *     defecto que dejaba «Activos» en 0 con estudiantes que sí respondían.
 */

/** Objeto encadenable que imita la API de Mongoose y resuelve a `result`. */
const chainable = (result: any) => {
  const query: any = {};
  for (const method of ['select', 'sort', 'lean', 'populate', 'limit', 'skip']) {
    query[method] = jest.fn(() => query);
  }
  query.exec = jest.fn(() => Promise.resolve(result));
  return query;
};

const objectId = (hex: string) => new Types.ObjectId(hex);

const COURSE_ID = '65f1a2b3c4d5e6f700000001';
const USER_IDS = [
  objectId('65f1a2b3c4d5e6f7000000a1'),
  objectId('65f1a2b3c4d5e6f7000000a2'),
];

type EnrollmentSeed = { total: number; activo: number; completado: number; retirado: number };

const buildService = (options: {
  course?: any;
  enrollments?: EnrollmentSeed;
  enrolledUserIds?: Types.ObjectId[];
  responders?: Types.ObjectId[];
  participants?: any[];
} = {}) => {
  const {
    course = { _id: objectId(COURSE_ID), name: 'Curso de prueba' },
    enrollments = { total: 0, activo: 0, completado: 0, retirado: 0 },
    enrolledUserIds = [],
    responders = [],
    participants = [],
  } = options;

  // `countDocuments` responde según el filtro de estado recibido.
  const countDocuments = jest.fn((filter: any) => {
    const statuses: string[] = filter?.status?.$in ?? [];
    if (statuses.length === 1 && statuses[0] === 'activo') {
      return chainable(enrollments.activo);
    }
    if (statuses.length === 1 && statuses[0] === 'completado') {
      return chainable(enrollments.completado);
    }
    if (statuses.length === 1 && statuses[0] === 'retirado') {
      return chainable(enrollments.retirado);
    }
    return chainable(enrollments.total);
  });

  const enrollmentModel: any = {
    countDocuments,
    find: jest.fn(() =>
      chainable(enrolledUserIds.map((userId) => ({ userId }))),
    ),
  };

  const userResponseModel: any = {
    distinct: jest.fn(() => chainable(responders)),
  };

  const participantModel: any = {
    find: jest.fn(() => chainable(participants)),
  };

  const courseModel: any = {
    find: jest.fn(() => chainable(course ? [course] : [])),
    findById: jest.fn(() => chainable(course)),
  };

  const service = new CourseService(
    courseModel,
    {} as any, // companyModel
    {} as any, // userModel
    participantModel,
    userResponseModel,
    enrollmentModel,
  );

  return {
    service,
    enrollmentModel,
    userResponseModel,
    participantModel,
    courseModel,
    countDocuments,
  };
};

describe('CourseService — conteo de inscritos (fuente única)', () => {
  describe('getProgress', () => {
    it('un curso con 6 inscritos y 3 con actividad da 6 totales, 3 activos y 50 %', async () => {
      const { service } = buildService({
        enrollments: { total: 6, activo: 4, completado: 2, retirado: 0 },
        enrolledUserIds: USER_IDS,
        responders: [USER_IDS[0], USER_IDS[1], objectId('65f1a2b3c4d5e6f7000000a3')],
      });

      const [progress] = await service.getProgress();

      expect(progress.totalParticipants).toBe(6);
      expect(progress.activeParticipants).toBe(3);
      expect(progress.progressPercent).toBe(50);
    });

    it('un curso sin inscritos devuelve ceros y no divide por cero', async () => {
      const { service } = buildService({
        enrollments: { total: 0, activo: 0, completado: 0, retirado: 0 },
      });

      const [progress] = await service.getProgress();

      expect(progress.totalParticipants).toBe(0);
      expect(progress.activeParticipants).toBe(0);
      expect(progress.progressPercent).toBe(0);
      expect(Number.isFinite(progress.progressPercent)).toBe(true);
    });

    it('las matrículas retiradas no cuentan como inscritos', async () => {
      const { service, countDocuments } = buildService({
        enrollments: { total: 2, activo: 2, completado: 0, retirado: 4 },
      });

      await service.getProgress();

      // La primera consulta es la del total: debe pedir solo activo + completado.
      const firstFilter = countDocuments.mock.calls[0][0];
      expect(firstFilter.status.$in).toEqual(['activo', 'completado']);
      expect(countDocuments.mock.calls[0][0].courseId).toBeInstanceOf(Types.ObjectId);
    });

    it('tolera un id de curso inválido devolviendo 0 en lugar de lanzar', async () => {
      const { service } = buildService({
        course: { _id: 'no-es-un-objectid', name: 'Curso roto' },
      });

      const [progress] = await service.getProgress();

      expect(progress.totalParticipants).toBe(0);
      expect(progress.activeParticipants).toBe(0);
    });
  });

  describe('getCourseProgressStats', () => {
    it('calcula actividad y finalización sobre el total de inscritos', async () => {
      const { service } = buildService({
        enrollments: { total: 4, activo: 3, completado: 1, retirado: 0 },
        enrolledUserIds: USER_IDS,
        responders: [USER_IDS[0]],
      });

      const stats = await service.getCourseProgressStats(COURSE_ID);

      expect(stats.totalStudents).toBe(4);
      expect(stats.activeStudents).toBe(3);
      expect(stats.completedStudents).toBe(1);
      expect(stats.withdrawnStudents).toBe(0);
      expect(stats.studentsWithActivity).toBe(1);
      expect(stats.activityRate).toBe(25); // 1 de 4
      expect(stats.completionRate).toBe(25); // 1 de 4
    });

    it('«inactivos» es exactamente lo mismo que «retirados»', async () => {
      const { service } = buildService({
        enrollments: { total: 3, activo: 1, completado: 0, retirado: 2 },
      });

      const stats = await service.getCourseProgressStats(COURSE_ID);

      expect(stats.inactiveStudents).toBe(stats.withdrawnStudents);
      expect(stats.inactiveStudents).toBe(2);
    });

    it('el promedio de puntos se divide por inscritos, no por participantes con documento', async () => {
      const { service } = buildService({
        enrollments: { total: 4, activo: 4, completado: 0, retirado: 0 },
        enrolledUserIds: USER_IDS,
        participants: [{ points: 100, level: 'plata' }, { points: 60, level: 'bronce' }],
      });

      const stats = await service.getCourseProgressStats(COURSE_ID);

      // 160 puntos entre 4 inscritos = 40, no 80.
      expect(stats.totalPoints).toBe(160);
      expect(stats.avgPoints).toBe(40);
    });

    it('sin inscritos las tasas quedan en 0 y no aparecen NaN', async () => {
      const { service } = buildService({
        enrollments: { total: 0, activo: 0, completado: 0, retirado: 0 },
      });

      const stats = await service.getCourseProgressStats(COURSE_ID);

      expect(stats.activityRate).toBe(0);
      expect(stats.completionRate).toBe(0);
      expect(stats.avgPoints).toBe(0);
    });

    it('lanza NotFound si el curso no existe', async () => {
      const { service } = buildService({ course: null });

      await expect(service.getCourseProgressStats(COURSE_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('cuenta la actividad por el campo «user» de las respuestas, no por «userId»', async () => {
      const { service, userResponseModel } = buildService({
        enrollments: { total: 2, activo: 2, completado: 0, retirado: 0 },
        enrolledUserIds: USER_IDS,
        responders: [USER_IDS[0]],
      });

      await service.getCourseProgressStats(COURSE_ID);

      expect(userResponseModel.distinct).toHaveBeenCalledWith('user', {
        user: { $in: USER_IDS },
      });
      // Guarda explícita contra la reaparición del defecto.
      const [, filter] = userResponseModel.distinct.mock.calls[0];
      expect(filter).not.toHaveProperty('userId');
    });

    it('no consulta respuestas si no hay inscritos', async () => {
      const { service, userResponseModel } = buildService({
        enrollments: { total: 0, activo: 0, completado: 0, retirado: 0 },
        enrolledUserIds: [],
      });

      const stats = await service.getCourseProgressStats(COURSE_ID);

      expect(stats.studentsWithActivity).toBe(0);
      expect(userResponseModel.distinct).not.toHaveBeenCalled();
    });
  });
});
