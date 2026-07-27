import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentController', () => {
  let controller: EnrollmentController;

  const mockEnrollmentService = {
    create: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
    getByCourse: jest.fn(),
    getMyCourses: jest.fn(),
    searchStudents: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentController],
      providers: [
        {
          provide: EnrollmentService,
          useValue: mockEnrollmentService,
        },
      ],
    }).compile();

    controller = module.get<EnrollmentController>(EnrollmentController);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════
  //  POST /api/enrollments
  // ═══════════════════════════════════════════════════════════════════
  describe('POST /api/enrollments — create', () => {
    const mockReq = {
      user: {
        sub: '507f1f77bcf86cd799439010',
        _id: '507f1f77bcf86cd799439010',
        roleName: 'Administrador',
      },
    };

    const mockDto = {
      courseId: '507f1f77bcf86cd799439011',
      studentIds: ['507f1f77bcf86cd799439012'],
    };

    it('debe llamar al service con los parámetros correctos', async () => {
      const mockResponse = {
        message: 'Se inscribieron 1 estudiante(s) exitosamente',
        created: [{ _id: 'abc', userId: '507f1f77bcf86cd799439012' }],
        skipped: [],
        errors: [],
      };
      mockEnrollmentService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockDto, mockReq as any);

      expect(mockEnrollmentService.create).toHaveBeenCalledWith(
        mockDto,
        '507f1f77bcf86cd799439010',
        'Administrador',
        '507f1f77bcf86cd799439010',
      );
      expect(result).toEqual(mockResponse);
    });

    it('debe propagar errores del service', async () => {
      mockEnrollmentService.create.mockRejectedValue(
        new Error('Curso no encontrado'),
      );

      await expect(
        controller.create(mockDto, mockReq as any),
      ).rejects.toThrow('Curso no encontrado');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  DELETE /api/enrollments/:id
  // ═══════════════════════════════════════════════════════════════════
  describe('DELETE /api/enrollments/:id — remove', () => {
    const mockReq = {
      user: {
        sub: '507f1f77bcf86cd799439010',
        _id: '507f1f77bcf86cd799439010',
        roleName: 'Administrador',
      },
    };
    const enrollmentId = '507f1f77bcf86cd799439020';

    it('debe llamar al service remove con los parámetros correctos', async () => {
      mockEnrollmentService.remove.mockResolvedValue({
        message: 'Estudiante retirado del curso exitosamente',
      });

      const result = await controller.remove(enrollmentId, mockReq as any);

      expect(mockEnrollmentService.remove).toHaveBeenCalledWith(
        enrollmentId,
        '507f1f77bcf86cd799439010',
        'Administrador',
      );
      expect(result.message).toContain('retirado');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  PATCH /api/enrollments/:id
  // ═══════════════════════════════════════════════════════════════════
  describe('PATCH /api/enrollments/:id — updateStatus', () => {
    const mockReq = {
      user: {
        sub: '507f1f77bcf86cd799439010',
        _id: '507f1f77bcf86cd799439010',
        roleName: 'Administrador',
      },
    };
    const enrollmentId = '507f1f77bcf86cd799439020';

    it('debe llamar al service updateStatus con los parámetros correctos', async () => {
      const mockDto = { status: 'completado' };
      mockEnrollmentService.updateStatus.mockResolvedValue({
        message: 'Inscripción actualizada a "completado" exitosamente',
        enrollment: { _id: enrollmentId, status: 'completado', completedAt: new Date() },
      });

      const result = await controller.updateStatus(
        enrollmentId,
        mockDto as any,
        mockReq as any,
      );

      expect(mockEnrollmentService.updateStatus).toHaveBeenCalledWith(
        enrollmentId,
        'completado',
        '507f1f77bcf86cd799439010',
        'Administrador',
      );
      expect(result.message).toContain('completado');
    });

    it('debe propagar errores del service', async () => {
      const mockDto = { status: 'retirado' };
      mockEnrollmentService.updateStatus.mockRejectedValue(
        new NotFoundException('Inscripción no encontrada'),
      );

      await expect(
        controller.updateStatus(enrollmentId, mockDto as any, mockReq as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  GET /api/enrollments/course/:courseId
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/enrollments/course/:courseId — getByCourse', () => {
    const courseId = '507f1f77bcf86cd799439011';
    const mockReq = {
      user: {
        sub: '507f1f77bcf86cd799439010',
        _id: '507f1f77bcf86cd799439010',
        roleName: 'Administrador',
      },
    };

    it('debe listar estudiantes sin filtros', async () => {
      const mockResponse = {
        students: [{ name: 'Carlos', status: 'activo' }],
        length: 1,
      };
      mockEnrollmentService.getByCourse.mockResolvedValue(mockResponse);

      const result = await controller.getByCourse(courseId, undefined, undefined, mockReq as any);

      expect(mockEnrollmentService.getByCourse).toHaveBeenCalledWith(
        courseId,
        '507f1f77bcf86cd799439010',
        'Administrador',
        undefined,
        undefined,
      );
      expect(result.students.length).toBe(1);
    });

    it('debe pasar filtros opcionales', async () => {
      mockEnrollmentService.getByCourse.mockResolvedValue({
        students: [],
        length: 0,
      });

      await controller.getByCourse(courseId, 'activo', 'Carlos', mockReq as any);

      expect(mockEnrollmentService.getByCourse).toHaveBeenCalledWith(
        courseId,
        '507f1f77bcf86cd799439010',
        'Administrador',
        'activo',
        'Carlos',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  GET /api/enrollments/my-courses
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/enrollments/my-courses — getMyCourses', () => {
    const mockReq = {
      user: {
        sub: '507f1f77bcf86cd799439012',
        _id: '507f1f77bcf86cd799439012',
      },
    };

    it('debe retornar cursos del estudiante autenticado', async () => {
      const mockResponse = {
        courses: [{ name: 'Matemáticas', status: 'activo' }],
        length: 1,
      };
      mockEnrollmentService.getMyCourses.mockResolvedValue(mockResponse);

      const result = await controller.getMyCourses(mockReq as any);

      expect(mockEnrollmentService.getMyCourses).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
      );
      expect(result.courses.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  GET /api/enrollments/search-students
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/enrollments/search-students — searchStudents', () => {
    it('debe buscar estudiantes por término', async () => {
      const mockResults = {
        data: [{ name: 'Carlos Pérez', email: 'carlos@test.com' }],
      };
      mockEnrollmentService.searchStudents.mockResolvedValue(
        mockResults.data,
      );

      const result = await controller.searchStudents('carlos');

      expect(mockEnrollmentService.searchStudents).toHaveBeenCalledWith(
        'carlos',
        undefined,
      );
      expect(result.data.length).toBe(1);
    });

    it('debe excluir estudiantes de un curso específico', async () => {
      mockEnrollmentService.searchStudents.mockResolvedValue([]);

      await controller.searchStudents('ana', '507f1f77bcf86cd799439011');

      expect(mockEnrollmentService.searchStudents).toHaveBeenCalledWith(
        'ana',
        '507f1f77bcf86cd799439011',
      );
    });
  });
});
