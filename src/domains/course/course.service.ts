import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company } from '../company/schemas/company.schema';
import { User } from '../users/schemas/user.schema';
import { Participant } from '../participant/schemas/participant.schema';
import { UserResponse } from '../userResponses/schemas/userResponse.schema';
import { Enrollment } from '../enrollment/schemas/enrollment.schema';
import { Course, CourseDocument } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Participant.name) private participantModel: Model<Participant>,
    @InjectModel(UserResponse.name)
    private userResponseModel: Model<UserResponse>,
    @InjectModel(Enrollment.name)
    private enrollmentModel: Model<Enrollment>,
  ) {}

  /**
   * Obtiene lista simple de cursos activos (solo _id y name) para selectores.
   */
  async getSimpleList(): Promise<{ _id: string; name: string }[]> {
    this.logger.log('Fetching simple course list...');
    const courses = await this.courseModel
      .find({ deleted: { $ne: true }, status: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean()
      .exec();
    return courses.map((c) => ({
      _id: c._id.toString(),
      name: (c as any).name,
    }));
  }

  /**
   * Obtiene el progreso de todos los cursos activos.
   * Calcula el % de participantes que han completado al menos una actividad.
   */
  async getProgress(): Promise<
    {
      courseId: string;
      courseName: string;
      totalParticipants: number;
      activeParticipants: number;
      progressPercent: number;
    }[]
  > {
    this.logger.log('Fetching course progress...');

    const courses = await this.courseModel
      .find({ deleted: { $ne: true }, status: true })
      .select('_id name')
      .lean()
      .exec();

    const progress = await Promise.all(
      courses.map(async (course) => {
        // Participantes inscritos en este curso
        const totalParticipants = await this.participantModel
          .countDocuments({ currentCourse: course._id, isActive: true })
          .exec();

        // Participantes que han completado al menos una actividad
        const participantUsers = await this.participantModel
          .find({ currentCourse: course._id, isActive: true })
          .select('userId')
          .lean()
          .exec();

        const userIds = participantUsers.map((p) => p.userId);

        let activeParticipants = 0;
        if (userIds.length > 0) {
          activeParticipants = await this.userResponseModel
            .distinct('user', { user: { $in: userIds } })
            .exec()
            .then((users) => users.length);
        }

        const progressPercent =
          totalParticipants > 0
            ? Math.round((activeParticipants / totalParticipants) * 100)
            : 0;

        return {
          courseId: course._id.toString(),
          courseName: (course as any).name,
          totalParticipants,
          activeParticipants,
          progressPercent,
        };
      }),
    );

    // Ordenar por % de progreso descendente
    progress.sort((a, b) => b.progressPercent - a.progressPercent);

    return progress;
  }

  /**
   * Crear un nuevo curso
   * @param createCourseDto - Datos para crear un curso
   * @returns El curso creado
   */
  async create(createCourseDto: CreateCourseDto) {
    try {
      // Validar que startDate sea anterior a endDate si ambos están presentes
      if (
        createCourseDto.startDate &&
        createCourseDto.endDate &&
        new Date(createCourseDto.startDate) > new Date(createCourseDto.endDate)
      ) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        );
      }

      const course = new this.courseModel({
        ...createCourseDto,
        createdAt: new Date(),
      });

      await course.save();

      this.logger.log(`Curso creado exitosamente: ${course.name}`);
      return { message: 'Curso creado exitosamente', course };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error al crear el curso', error.stack);
      throw new InternalServerErrorException('Error al crear el curso');
    }
  }

  /**
   * Resuelve los nombres de institución e instructor a partir de los IDs
   */
  private async resolveNames(courses: CourseDocument[]): Promise<any[]> {
    if (courses.length === 0) return [];

    // Colectar IDs únicos
    const companyIds = [
      ...new Set(courses.map((c) => c.companyId).filter(Boolean)),
    ];
    const instructorIds = [
      ...new Set(courses.map((c) => c.instructorId).filter(Boolean)),
    ];

    // Buscar empresas e instructors en batch con campos extendidos
    const [companies, instructors] = await Promise.all([
      companyIds.length > 0
        ? this.companyModel
            .find({ _id: { $in: companyIds } })
            .select('_id name nit email')
            .exec()
        : Promise.resolve([]),
      instructorIds.length > 0
        ? this.userModel
            .find({ _id: { $in: instructorIds } })
            .select('_id name email documentNumber')
            .exec()
        : Promise.resolve([]),
    ]);

    // Crear mapas de lookup con datos completos
    const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));
    const instructorMap = new Map(
      instructors.map((u) => [u._id.toString(), u]),
    );

    // Mapear los nombres al resultado
    return courses.map((course) => {
      const courseObj = course.toObject();
      const company = course.companyId
        ? companyMap.get(course.companyId)
        : null;
      const instructor = course.instructorId
        ? instructorMap.get(course.instructorId)
        : null;
      return {
        ...courseObj,
        companyName: company?.name || null,
        companyNit: company?.nit || null,
        companyEmail: company?.email || null,
        instructorName: instructor?.name || null,
        instructorEmail: instructor?.email || null,
        instructorDocument: instructor?.documentNumber || null,
      };
    });
  }

  /**
   * Obtener todos los cursos con filtros opcionales y paginación
   * @param filters - Filtros y paginación
   * @returns Lista de cursos con nombres resueltos
   */
  async findAll(filters: {
    companyId?: string;
    status?: boolean;
    page?: number;
    rows?: number;
  }) {
    try {
      const { companyId, status, page = 1, rows = 10 } = filters;

      const query: any = { deleted: { $ne: true } };

      if (companyId) {
        query.companyId = companyId;
      }

      if (status !== undefined) {
        query.status = status;
      }

      const courses = await this.courseModel
        .find(query)
        .skip(rows * (page - 1))
        .limit(rows)
        .sort({ createdAt: -1 });

      const total = await this.courseModel.countDocuments(query);

      // Resolver nombres de institución e instructor
      const coursesWithNames = await this.resolveNames(courses);

      return {
        message: 'Cursos obtenidos exitosamente',
        courses: coursesWithNames,
        length: total,
        page,
        rows,
      };
    } catch (error) {
      this.logger.error('Error al obtener los cursos', error.stack);
      throw new InternalServerErrorException('Error al obtener los cursos');
    }
  }

  /**
   * Resuelve nombres para un curso individual
   */
  private async resolveSingleName(course: CourseDocument): Promise<any> {
    const [resolved] = await this.resolveNames([course]);
    return resolved;
  }

  /**
   * Obtener un curso por ID
   * @param id - ID del curso
   * @returns El curso con nombres resueltos
   */
  async findOne(id: string) {
    try {
      const course = await this.courseModel.findOne({
        _id: id,
        deleted: { $ne: true },
      });

      if (!course) {
        this.logger.warn(`Curso con ID ${id} no encontrado`);
        throw new NotFoundException('Curso no encontrado');
      }

      const courseWithNames = await this.resolveSingleName(course);

      return {
        message: 'Curso encontrado exitosamente',
        course: courseWithNames,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener el curso con ID ${id}`, error.stack);
      throw new InternalServerErrorException('Error al obtener el curso');
    }
  }

  /**
   * Actualizar un curso
   * @param id - ID del curso
   * @param updateCourseDto - Datos para actualizar
   * @returns El curso actualizado
   */
  async update(id: string, updateCourseDto: UpdateCourseDto) {
    try {
      // Validar que startDate sea anterior a endDate si ambos están presentes
      if (
        updateCourseDto.startDate &&
        updateCourseDto.endDate &&
        new Date(updateCourseDto.startDate) > new Date(updateCourseDto.endDate)
      ) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        );
      }

      const course = await this.courseModel.findOneAndUpdate(
        { _id: id, deleted: { $ne: true } },
        { ...updateCourseDto, updatedAt: new Date() },
        { new: true },
      );

      if (!course) {
        this.logger.warn(`Curso con ID ${id} no encontrado`);
        throw new NotFoundException('Curso no encontrado');
      }

      this.logger.log(`Curso con ID ${id} actualizado exitosamente`);
      return { message: 'Curso actualizado exitosamente', course };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar el curso con ID ${id}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar el curso');
    }
  }

  /**
   * Eliminar un curso (soft delete)
   * @param id - ID del curso
   * @param deletedBy - Usuario que elimina
   * @returns El curso eliminado
   */
  async remove(id: string, deletedBy?: string) {
    try {
      const course = await this.courseModel.findOneAndUpdate(
        { _id: id, deleted: { $ne: true } },
        {
          deleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
        { new: true },
      );

      if (!course) {
        this.logger.warn(`Curso con ID ${id} no encontrado`);
        throw new NotFoundException('Curso no encontrado');
      }

      this.logger.log(`Curso con ID ${id} eliminado exitosamente`);
      return { message: 'Curso eliminado exitosamente', course };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al eliminar el curso con ID ${id}`, error.stack);
      throw new InternalServerErrorException('Error al eliminar el curso');
    }
  }

  /**
   * Obtener cursos por ID de compañía
   * @param companyId - ID de la compañía
   * @returns Lista de cursos de la compañía
   */
  /**
   * Obtiene cursos donde un instructor (docente) está asignado.
   * Incluye conteo de estudiantes y progreso básico.
   */
  async findByInstructor(instructorId: string) {
    this.logger.log(`Finding courses for instructor: ${instructorId}`);
    try {
      const courses = await this.courseModel
        .find({
          instructorId,
          deleted: { $ne: true },
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      // Para cada curso, contar estudiantes y calcular progreso
      const coursesWithStats = await Promise.all(
        courses.map(async (course: any) => {
          const studentCount = await this.participantModel
            .countDocuments({ currentCourse: course._id })
            .exec();

          const completedCount = await this.userResponseModel
            .distinct('userId', {
              activityId: {
                $in: await this.participantModel
                  .find({ currentCourse: course._id })
                  .distinct('userId')
                  .exec(),
              },
            })
            .exec();

          return {
            _id: course._id,
            name: course.name,
            description: course.description,
            category: course.category,
            status: course.status,
            startDate: course.startDate,
            endDate: course.endDate,
            maxStudents: course.maxStudents,
            studentCount,
            activeStudents: completedCount.length,
            createdAt: course.createdAt,
          };
        }),
      );

      return {
        message: 'Cursos del docente obtenidos exitosamente',
        courses: coursesWithStats,
        length: coursesWithStats.length,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener cursos del instructor ${instructorId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al obtener los cursos del docente',
      );
    }
  }

  /**
   * Obtiene los estudiantes de un curso con su progreso.
   */
  async getCourseStudents(courseId: string) {
    this.logger.log(`Fetching students for course: ${courseId}`);

    const participants = await this.participantModel
      .find({ currentCourse: courseId })
      .populate({
        path: 'userId',
        select: 'name email username avatar documentNumber isActive',
        model: 'User',
      })
      .lean()
      .exec();

    if (!participants || participants.length === 0) {
      return {
        message: 'No hay estudiantes en este curso',
        students: [],
        length: 0,
      };
    }

    // Obtener conteo de respuestas por estudiante
    const userIds = participants.map((p: any) => p.userId?._id).filter(Boolean);

    const responseCounts = await this.userResponseModel
      .aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ])
      .exec();

    const countMap = new Map(
      responseCounts.map((r) => [r._id.toString(), r.count]),
    );

    const students = participants.map((p: any) => {
      const user = p.userId || {};
      const userId = user._id?.toString();
      return {
        _id: p._id,
        userId: userId,
        name: user.name || '—',
        email: user.email || '',
        username: user.username || '',
        documentNumber: user.documentNumber || '',
        avatar: user.avatar || '',
        isActive: user.isActive !== false,
        nickname: p.nickname || '',
        points: p.points || 0,
        level: p.level || 'bronce',
        currentStreak: p.currentStreak || 0,
        maxStreak: p.maxStreak || 0,
        totalActivitiesCompleted: p.totalActivitiesCompleted || 0,
        lastActivityDate: p.lastActivityDate || null,
        activitiesResponded: countMap.get(userId) || 0,
      };
    });

    return {
      message: 'Estudiantes del curso obtenidos exitosamente',
      students,
      length: students.length,
    };
  }

  /**
   * Obtiene estadísticas agregadas de un curso.
   */
  async getCourseProgressStats(courseId: string) {
    this.logger.log(`Fetching progress stats for course: ${courseId}`);

    const course = await this.courseModel.findById(courseId).lean().exec();
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const courseObjId = new Types.ObjectId(courseId);

    // Total de estudiantes: contar desde enrollments (inscripciones activas o completadas)
    const totalStudents = await this.enrollmentModel
      .countDocuments({
        courseId: courseObjId,
        status: { $in: ['activo', 'completado'] },
      })
      .exec();

    // Obtener userIds de los estudiantes inscritos para buscar sus participants
    const enrollments = await this.enrollmentModel
      .find({
        courseId: courseObjId,
        status: { $in: ['activo', 'completado'] },
      })
      .select('userId')
      .lean()
      .exec();

    const userIds = enrollments.map((e: any) => e.userId);

    // Buscar participants por userId (no por currentCourse)
    const participants = await this.participantModel
      .find({ userId: { $in: userIds } })
      .select('userId totalActivitiesCompleted points level')
      .lean()
      .exec();

    const activeStudents = participants.filter(
      (p: any) => (p.totalActivitiesCompleted || 0) > 0,
    ).length;

    // Puntaje promedio
    const totalPoints = participants.reduce(
      (sum: number, p: any) => sum + (p.points || 0),
      0,
    );
    const avgPoints =
      totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;

    // Distribución de niveles
    const levelDistribution: Record<string, number> = {};
    participants.forEach((p: any) => {
      const level = p.level || 'bronce';
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    });

    return {
      courseId,
      courseName: (course as any).name,
      totalStudents,
      activeStudents,
      inactiveStudents: totalStudents - activeStudents,
      avgPoints,
      totalPoints,
      levelDistribution,
      completionRate:
        totalStudents > 0
          ? Math.round((activeStudents / totalStudents) * 100)
          : 0,
    };
  }

  async findByCompany(companyId: string) {
    try {
      const courses = await this.courseModel
        .find({ companyId, deleted: { $ne: true } })
        .sort({ createdAt: -1 });

      return {
        message: 'Cursos de la compañía obtenidos exitosamente',
        courses,
        length: courses.length,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener cursos de la compañía ${companyId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al obtener los cursos de la compañía',
      );
    }
  }

  async search(searchTerm: string): Promise<Partial<Course>[]> {
    if (!searchTerm || searchTerm === 'all') {
      return this.courseModel.find().limit(20).sort({ createdAt: -1 }).exec();
    }
    const regex = new RegExp(searchTerm, 'i');
    return this.courseModel
      .find({
        $or: [
          { name: { $regex: regex } },
          { description: { $regex: regex } },
          { category: { $regex: regex } },
        ],
      })
      .limit(20)
      .sort({ createdAt: -1 })
      .exec();
  }
}
