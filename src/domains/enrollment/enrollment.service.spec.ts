import { jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Course } from '../course/schemas/course.schema';
import { User } from '../users/schemas/user.schema';
import { EnrollmentService } from './enrollment.service';
import { Enrollment } from './schemas/enrollment.schema';

describe('EnrollmentService', () => {
  let service: EnrollmentService;

  // Variable para controlar el comportamiento del save mockeado
  let saveMockImplementation: () => any;

  // Helper: crea un documento mock con save()
  const createMockDocument = (data: any = {}) => {
    const saveFn = jest.fn().mockImplementation(() => {
      if (saveMockImplementation) {
        return saveMockImplementation();
      }
      return Promise.resolve({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        ...data,
        createdAt: new Date('2026-06-28'),
        status: data.status || 'activo',
      });
    });
    return {
      _id: new Types.ObjectId(),
      ...data,
      save: saveFn,
      status: data.status || 'activo',
    };
  };

  // Mock del modelo Enrollment: debe ser una FUNCIÓN (constructor) con métodos estáticos
  const mockEnrollmentModel = jest.fn().mockImplementation((data) =>
    createMockDocument(data),
  ) as any;
  mockEnrollmentModel.find = jest.fn();
  mockEnrollmentModel.findById = jest.fn();
  mockEnrollmentModel.findOne = jest.fn();
  // Default: countDocuments retorna query con exec() que resuelve 0
  mockEnrollmentModel.countDocuments = jest
    .fn()
    .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

  const mockUserModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    db: {
      model: jest.fn().mockReturnThis(),
    },
  } as any;

  const mockCourseModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  } as any;

  // Helper para crear un mock de query Mongoose con método exec() al final
  const createMockQuery = (result: any, distinctResult: any[] = []) => {
    // Para el caso especial: enrollmentModel.find().distinct('userId').exec()
    // .distinct() debe devolver un objeto con .exec()
    let distinctResolver: (() => any) | null = null;

    const query: any = {
      exec: jest.fn().mockImplementation(() => {
        if (distinctResolver) return distinctResolver();
        return Promise.resolve(result);
      }),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockImplementation((field: string) => {
        // Guardar resolutor para cuando se llame exec()
        distinctResolver = () => Promise.resolve(distinctResult);
        return query; // chainable: find().distinct().exec()
      }),
    };
    return query;
  };

  const estudianteRoleId = new Types.ObjectId();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        {
          provide: getModelToken(Enrollment.name),
          useValue: mockEnrollmentModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Course.name),
          useValue: mockCourseModel,
        },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════
  //  create()
  // ═══════════════════════════════════════════════════════════════════
  describe('create', () => {
    const dto = {
      courseId: '507f1f77bcf86cd799439011',
      studentIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
    };
    const adminUserId = '507f1f77bcf86cd799439010';
    const adminRoleName = 'Administrador';

    const mockCourse = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Matemáticas',
      instructorId: new Types.ObjectId('507f1f77bcf86cd799439010'),
      maxStudents: 30,
    };

    const mockStudents = [
      {
        _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Carlos Pérez',
        email: 'carlos@test.com',
        documentNumber: '12345',
        role: { _id: estudianteRoleId, name: 'Estudiante' },
      },
      {
        _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
        name: 'Ana Gómez',
        email: 'ana@test.com',
        documentNumber: '67890',
        role: { _id: estudianteRoleId, name: 'Estudiante' },
      },
    ];

    it('debe inscribir estudiantes exitosamente (admin)', async () => {
      mockCourseModel.findOne.mockReturnValue(
        createMockQuery(mockCourse),
      );
      mockUserModel.find.mockReturnValue(
        createMockQuery(mockStudents),
      );
      mockEnrollmentModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      });

      const result = await service.create(
        dto,
        adminUserId,
        adminRoleName,
      );

      expect(result.created.length).toBe(2);
      expect(result.skipped.length).toBe(0);
      expect(result.errors.length).toBe(0);
      expect(result.message).toContain('2');
    });

    it('debe rechazar si el curso no existe', async () => {
      mockCourseModel.findOne.mockReturnValue(
        createMockQuery(null),
      );

      await expect(
        service.create(dto, adminUserId, adminRoleName),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar si el docente no es instructor del curso', async () => {
      const otroProfesor = '507f1f77bcf86cd799439099';
      mockCourseModel.findOne.mockReturnValue(
        createMockQuery(mockCourse),
      );

      await expect(
        service.create(dto, otroProfesor, 'Docente'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir a un docente inscribir en su propio curso', async () => {
      const docenteId = '507f1f77bcf86cd799439010'; // mismo que instructorId del curso
      mockCourseModel.findOne.mockReturnValue(
        createMockQuery(mockCourse),
      );
      mockUserModel.find.mockReturnValue(
        createMockQuery(mockStudents),
      );
      mockEnrollmentModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      });

      const result = await service.create(
        dto,
        docenteId,
        'Docente',
        docenteId,
      );

      expect(result.created.length).toBe(2);
    });

    it('debe rechazar si no hay estudiantes con rol Estudiante', async () => {
      const studentsSinRol = [
        {
          _id: mockStudents[0]._id,
          name: 'Carlos Pérez',
          role: { _id: new Types.ObjectId(), name: 'Docente' },
        },
      ];
      mockCourseModel.findOne.mockReturnValue(
        createMockQuery(mockCourse),
      );
      mockUserModel.find.mockReturnValue(
        createMockQuery(studentsSinRol),
      );

      await expect(
        service.create(dto, adminUserId, adminRoleName),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si el curso supera el cupo máximo', async () => {
      mockCourseModel.findOne.mockReturnValue(
        createMockQuery({ ...mockCourse, maxStudents: 5 }),
      );
      mockEnrollmentModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      });

      await expect(
        service.create(dto, adminUserId, adminRoleName),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe saltar estudiantes ya inscritos (error 11000)', async () => {
      // Forzar error de duplicado en el segundo estudiante
      let callCount = 0;
      saveMockImplementation = () => {
        callCount++;
        if (callCount === 2) {
          const err: any = new Error('Duplicate key');
          err.code = 11000;
          throw err;
        }
        return Promise.resolve({
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          createdAt: new Date(),
          status: 'activo',
        });
      };

      mockCourseModel.findOne.mockReturnValue(
        createMockQuery(mockCourse),
      );
      mockUserModel.find.mockReturnValue(
        createMockQuery(mockStudents),
      );
      mockEnrollmentModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      });

      const result = await service.create(
        dto,
        adminUserId,
        adminRoleName,
      );

      expect(result.created.length).toBe(1);
      expect(result.skipped.length).toBe(1);

      // Reset
      saveMockImplementation = null as any;
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  remove()
  // ═══════════════════════════════════════════════════════════════════
  describe('remove', () => {
    const enrollmentId = '507f1f77bcf86cd799439020';
    const adminId = '507f1f77bcf86cd799439010';

    it('debe retirar un estudiante exitosamente', async () => {
      const mockEnrollment = {
        _id: enrollmentId,
        courseId: new Types.ObjectId('507f1f77bcf86cd799439011'),
        status: 'activo',
        save: jest.fn().mockResolvedValue(true),
      };
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEnrollment),
      });

      const result = await service.remove(enrollmentId, adminId, 'Administrador');

      expect(result.message).toContain('retirado');
      expect(mockEnrollment.status).toBe('retirado');
    });

    it('debe lanzar NotFoundException si el enrollment no existe', async () => {
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.remove(enrollmentId, adminId, 'Administrador'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si docente intenta retirar de curso ajeno', async () => {
      const mockEnrollment = {
        _id: enrollmentId,
        courseId: new Types.ObjectId('507f1f77bcf86cd799439011'),
        status: 'activo',
        save: jest.fn(),
      };
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEnrollment),
      });
      mockCourseModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockEnrollment.courseId,
          instructorId: new Types.ObjectId('507f1f77bcf86cd799439999'), // otro docente
        }),
      });

      await expect(
        service.remove(enrollmentId, adminId, 'Docente'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  updateStatus()
  // ═══════════════════════════════════════════════════════════════════
  describe('updateStatus', () => {
    const enrollmentId = '507f1f77bcf86cd799439020';
    const adminId = '507f1f77bcf86cd799439010';
    const adminRole = 'Administrador';

    const baseMockEnrollment = () => ({
      _id: enrollmentId,
      courseId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      status: 'activo',
      completedAt: null,
      save: jest.fn().mockResolvedValue(true),
    });

    it('debe cambiar estado a completado y establecer completedAt', async () => {
      const mockEnrollment = baseMockEnrollment();
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEnrollment),
      });

      const result = await service.updateStatus(
        enrollmentId,
        'completado',
        adminId,
        adminRole,
      );

      expect(mockEnrollment.status).toBe('completado');
      expect(mockEnrollment.completedAt).toBeInstanceOf(Date);
      expect(result.message).toContain('completado');
    });

    it('debe cambiar estado a retirado sin completar completedAt', async () => {
      const mockEnrollment = baseMockEnrollment();
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEnrollment),
      });

      const result = await service.updateStatus(
        enrollmentId,
        'retirado',
        adminId,
        adminRole,
      );

      expect(mockEnrollment.status).toBe('retirado');
      expect(mockEnrollment.completedAt).toBeNull();
      expect(result.message).toContain('retirado');
    });

    it('debe limpiar completedAt al reactivar (activo)', async () => {
      const mockEnrollment = baseMockEnrollment();
      mockEnrollment.status = 'completado';
      mockEnrollment.completedAt = new Date('2026-06-28');
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEnrollment),
      });

      await service.updateStatus(enrollmentId, 'activo', adminId, adminRole);

      expect(mockEnrollment.status).toBe('activo');
      expect(mockEnrollment.completedAt).toBeNull();
    });

    it('debe lanzar NotFoundException si el enrollment no existe', async () => {
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateStatus(enrollmentId, 'activo', adminId, adminRole),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si docente modifica curso ajeno', async () => {
      const mockEnrollment = baseMockEnrollment();
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEnrollment),
      });
      mockCourseModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockEnrollment.courseId,
          instructorId: new Types.ObjectId('507f1f77bcf86cd799439999'),
        }),
      });

      await expect(
        service.updateStatus(enrollmentId, 'completado', adminId, 'Docente'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir a docente cambiar estado en su propio curso', async () => {
      const docenteId = '507f1f77bcf86cd799439010'; // mismo instructorId
      const mockEnrollment = baseMockEnrollment();
      mockEnrollmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEnrollment),
      });
      mockCourseModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockEnrollment.courseId,
          instructorId: new Types.ObjectId(docenteId),
        }),
      });

      const result = await service.updateStatus(
        enrollmentId,
        'completado',
        docenteId,
        'Docente',
      );

      expect(mockEnrollment.status).toBe('completado');
      expect(result.message).toContain('completado');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getByCourse()
  // ═══════════════════════════════════════════════════════════════════
  describe('getByCourse', () => {
    const courseId = '507f1f77bcf86cd799439011';
    const adminId = '507f1f77bcf86cd799439010';

    const mockEnrollments = [
      {
        _id: new Types.ObjectId(),
        userId: {
          _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
          name: 'Carlos Pérez',
          email: 'carlos@test.com',
          documentNumber: '12345',
          avatar: 'avatar1.png',
          isActive: true,
        },
        createdBy: {
          _id: new Types.ObjectId(adminId),
          name: 'Admin',
        },
        status: 'activo',
        createdAt: new Date('2026-06-28'),
      },
    ];

    it('debe listar estudiantes de un curso', async () => {
      // Mock de verificación de permiso para admin (no verifica instructor)
      mockEnrollmentModel.find.mockReturnValue(
        createMockQuery(mockEnrollments),
      );

      const result = await service.getByCourse(
        courseId,
        adminId,
        'Administrador',
      );

      expect(result.students.length).toBe(1);
      expect(result.students[0].name).toBe('Carlos Pérez');
      expect(result.students[0].status).toBe('activo');
    });

    it('debe filtrar por término de búsqueda', async () => {
      const mockMultiple = [
        ...mockEnrollments,
        {
          _id: new Types.ObjectId(),
          userId: {
            _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
            name: 'Ana Gómez',
            email: 'ana@test.com',
            documentNumber: '67890',
            avatar: 'avatar2.png',
            isActive: true,
          },
          createdBy: {
            _id: new Types.ObjectId(adminId),
            name: 'Admin',
          },
          status: 'activo',
          createdAt: new Date('2026-06-28'),
        },
      ];

      mockEnrollmentModel.find.mockReturnValue(
        createMockQuery(mockMultiple),
      );

      const result = await service.getByCourse(
        courseId,
        adminId,
        'Administrador',
        undefined,
        'Ana',
      );

      expect(result.students.length).toBe(1);
      expect(result.students[0].name).toBe('Ana Gómez');
    });

    it('debe lanzar ForbiddenException si docente ve curso ajeno', async () => {
      mockCourseModel.findById.mockReturnValue(
        createMockQuery({
          _id: new Types.ObjectId(courseId),
          instructorId: new Types.ObjectId('507f1f77bcf86cd799439999'),
        }),
      );

      await expect(
        service.getByCourse(courseId, adminId, 'Docente'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getMyCourses()
  // ═══════════════════════════════════════════════════════════════════
  describe('getMyCourses', () => {
    const userId = '507f1f77bcf86cd799439012';

    it('debe retornar los cursos del estudiante', async () => {
      const mockEnrollments = [
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(userId),
          courseId: {
            _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
            name: 'Matemáticas',
            description: 'Curso de matemáticas',
            category: 'Ciencias',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            status: true,
          },
          status: 'activo',
          createdAt: new Date('2026-06-28'),
        },
      ];

      mockEnrollmentModel.find.mockReturnValue(
        createMockQuery(mockEnrollments),
      );

      const result = await service.getMyCourses(userId);

      expect(result.courses.length).toBe(1);
      expect(result.courses[0].name).toBe('Matemáticas');
      expect(result.courses[0].status).toBe('activo');
    });

    it('debe retornar lista vacía si no hay cursos', async () => {
      mockEnrollmentModel.find.mockReturnValue(
        createMockQuery([]),
      );

      const result = await service.getMyCourses(userId);

      expect(result.courses.length).toBe(0);
      expect(result.length).toBe(0);
    });

    it('debe filtrar cursos con status=false (inactivos)', async () => {
      const mockEnrollments = [
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(userId),
          courseId: {
            _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
            name: 'Curso Inactivo',
            status: false, // curso inactivo
          },
          status: 'activo',
          createdAt: new Date('2026-06-28'),
        },
      ];

      mockEnrollmentModel.find.mockReturnValue(
        createMockQuery(mockEnrollments),
      );

      const result = await service.getMyCourses(userId);

      expect(result.courses.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  searchStudents()
  // ═══════════════════════════════════════════════════════════════════
  describe('searchStudents', () => {
    const mockRole = { _id: estudianteRoleId, name: 'Estudiante' };
    const mockStudents = [
      {
        _id: new Types.ObjectId(),
        name: 'Carlos Pérez',
        email: 'carlos@test.com',
        documentNumber: '12345',
        username: 'carlosp',
        avatar: 'avatar.png',
      },
    ];

    it('debe buscar estudiantes por término', async () => {
      // Mock de Role.findOne
      const mockRoleModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockRole),
        }),
      };
      mockUserModel.db.model.mockReturnValue(mockRoleModel);
      mockUserModel.find.mockReturnValue(
        createMockQuery(mockStudents),
      );

      const result = await service.searchStudents('carlos');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Carlos Pérez');
    });

    it('debe retornar array vacío si no existe rol Estudiante', async () => {
      const mockRoleModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      };
      mockUserModel.db.model.mockReturnValue(mockRoleModel);

      const result = await service.searchStudents('carlos');

      expect(result).toEqual([]);
    });

    it('debe excluir estudiantes ya inscritos si se pasa excludeCourseId', async () => {
      const mockRoleModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockRole),
        }),
      };
      mockUserModel.db.model.mockReturnValue(mockRoleModel);

      // Mock de distinct para enrollments: .distinct() debe retornar objeto con .exec()
      mockEnrollmentModel.find.mockReturnValue({
        distinct: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            new Types.ObjectId('507f1f77bcf86cd799439099'),
          ]),
        }),
      });

      mockUserModel.find.mockReturnValue(
        createMockQuery(mockStudents),
      );

      const result = await service.searchStudents(
        'carlos',
        '507f1f77bcf86cd799439011',
      );

      // Verificar que se llamó distinct
      expect(mockEnrollmentModel.find).toHaveBeenCalled();
    });
  });
});
