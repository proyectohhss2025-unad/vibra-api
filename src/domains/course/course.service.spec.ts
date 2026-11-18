import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CourseService } from './course.service';

type CourseDoc = { instructorId?: unknown };

/**
 * Crea el servicio con un mock mínimo del modelo Course.
 * `courseModel.findOne(...).select(...).lean().exec()` es la cadena que usa
 * `assertCanManageCourse`; el resto de modelos no interviene en ese método.
 */
const buildService = (course: CourseDoc | null) => {
  const exec = jest.fn().mockResolvedValue(course);
  const lean = jest.fn().mockReturnValue({ exec });
  const select = jest.fn().mockReturnValue({ lean });
  const findOne = jest.fn().mockReturnValue({ select });

  const courseModel = { findOne } as any;
  const empty = {} as any;

  const service = new CourseService(
    courseModel,
    empty,
    empty,
    empty,
    empty,
    empty,
  );

  return { service, findOne };
};

describe('CourseService.assertCanManageCourse', () => {
  it('permite cualquier curso a un usuario privilegiado sin consultar la BD', async () => {
    const { service, findOne } = buildService(null);

    await expect(
      service.assertCanManageCourse('curso-1', 'admin-1', true),
    ).resolves.toBeUndefined();

    expect(findOne).not.toHaveBeenCalled();
  });

  it('permite el curso cuando el usuario es su instructor', async () => {
    const { service } = buildService({ instructorId: 'docente-1' });

    await expect(
      service.assertCanManageCourse('curso-1', 'docente-1', false),
    ).resolves.toBeUndefined();
  });

  it('rechaza con 403 un curso de otro instructor', async () => {
    const { service } = buildService({ instructorId: 'docente-1' });

    await expect(
      service.assertCanManageCourse('curso-1', 'docente-2', false),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza con 403 un curso sin instructor asignado', async () => {
    const { service } = buildService({ instructorId: '' });

    await expect(
      service.assertCanManageCourse('curso-1', 'docente-1', false),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('responde 404 cuando el curso no existe', async () => {
    const { service } = buildService(null);

    await expect(
      service.assertCanManageCourse('curso-x', 'docente-1', false),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
