import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company } from '../company/schemas/company.schema';
import { Enrollment } from '../enrollment/schemas/enrollment.schema';
import { Participant } from '../participant/schemas/participant.schema';
import { UserResponse } from '../userResponses/schemas/userResponse.schema';
import { User } from '../users/schemas/user.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course, CourseDocument } from './schemas/course.schema';

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

  // ─────────────────────────────────────────────────────────────────────────
  //  FUENTE ÚNICA DE VERDAD: quién está inscrito en un curso
  //
  //  Antes convivían dos fuentes incompatibles y una de ellas estaba rota:
  //
  //   · `participant.currentCourse` — puntero denormalizado que NINGÚN servicio
  //     escribe (solo se puede fijar por DTO). Daba 0 estudiantes.
  //   · `enrollments` — registro real de matrícula, con índice único
  //     (userId, courseId) y estado `activo | completado | retirado`.
  //
  //  La fuente canónica es `enrollments`. Todo conteo de estudiantes del curso
  //  pasa por estos dos helpers (informe del 4-nov-2026, hallazgo D-06).
  // ─────────────────────────────────────────────────────────────────────────

  /** Estados de matrícula que cuentan como «inscrito». `retirado` queda fuera. */
  private static readonly ENROLLED_STATUSES = ['activo', 'completado'];

  /** Construye el filtro de matrículas, tolerando un id inválido sin lanzar. */
  private enrollmentFilter(courseId: string, statuses: string[]) {
    let objectId: Types.ObjectId;
    try {
      objectId = new Types.ObjectId(courseId);
    } catch {
      return null;
    }
    return { courseId: objectId, status: { $in: statuses } };
  }

  /** Cuenta matrículas del curso en los estados indicados. */
  private async countEnrollments(
    courseId: string,
    statuses: string[] = CourseService.ENROLLED_STATUSES,
  ): Promise<number> {
    const filter = this.enrollmentFilter(courseId, statuses);
    if (!filter) return 0;
    return this.enrollmentModel.countDocuments(filter).exec();
  }

  /** Ids de usuario inscritos (activo + completado), sin duplicados. */
  private async getEnrolledUserIds(courseId: string): Promise<Types.ObjectId[]> {
    const filter = this.enrollmentFilter(
      courseId,
      CourseService.ENROLLED_STATUSES,
    );
    if (!filter) return [];
    const rows = await this.enrollmentModel
      .find(filter)
      .select('userId')
      .lean()
      .exec();
    return rows
      .map((row: any) => row.userId)
      .filter(Boolean) as Types.ObjectId[];
  }

  /**
   * Inscritos que además tienen actividad registrada.
   *
   * El campo de usuario en `UserResponse` es `user`, NO `userId`: las consultas
   * que usaban `userId` devolvían siempre vacío y hacían que «Activos» saliera
   * en 0 con estudiantes que sí habían respondido.
   */
  private async countEnrolledWithActivity(
    userIds: Types.ObjectId[],
  ): Promise<number> {
    if (userIds.length === 0) return 0;
    const responders = await this.userResponseModel
      .distinct('user', { user: { $in: userIds } })
      .exec();
    return responders.length;
  }

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
        const courseId = course._id.toString();

        // Inscritos según la matrícula (fuente única).
        const totalParticipants = await this.countEnrollments(courseId);

        // De ellos, los que además tienen actividad registrada.
        const userIds = await this.getEnrolledUserIds(courseId);
        const activeParticipants = await this.countEnrolledWithActivity(userIds);

        const progressPercent =
          totalParticipants > 0
            ? Math.round((activeParticipants / totalParticipants) * 100)
            : 0;

        return {
          courseId,
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

      // Para cada curso, contar estudiantes y calcular progreso.
      // La fuente es la matrícula, no `participant.currentCourse`.
      const coursesWithStats = await Promise.all(
        courses.map(async (course: any) => {
          const courseId = course._id.toString();

          const studentCount = await this.countEnrollments(courseId);
          const activeStudents = await this.countEnrollments(courseId, [
            'activo',
          ]);
          const userIds = await this.getEnrolledUserIds(courseId);
          const studentsWithActivity =
            await this.countEnrolledWithActivity(userIds);

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
            activeStudents,
            studentsWithActivity,
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
   * Valida que el solicitante pueda gestionar un curso.
   *
   * Un usuario privilegiado (SuperAdmin o serial `10`) puede gestionar
   * cualquier curso; el resto sólo los que tiene asignados como instructor.
   * Evita que un docente enumere estudiantes de cursos ajenos pasando un
   * `courseId` arbitrario en la URL.
   */
  async assertCanManageCourse(
    courseId: string,
    userId: string | undefined,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;

    const course = await this.courseModel
      .findOne({ _id: courseId, deleted: { $ne: true } })
      .select('instructorId')
      .lean()
      .exec();

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const instructorId = (course as any).instructorId
      ? String((course as any).instructorId)
      : '';

    if (!instructorId || instructorId !== String(userId || '')) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar este curso',
      );
    }
  }

  /**
   * Obtiene los estudiantes de un curso con su progreso.
   *
   * La lista sale de la matrícula (`enrollments`), no de
   * `participant.currentCourse`. Un inscrito puede no tener todavía documento
   * de participante: en ese caso se devuelven sus datos de usuario con los
   * valores iniciales en cero, en lugar de omitirlo.
   */
  async getCourseStudents(courseId: string) {
    this.logger.log(`Fetching students for course: ${courseId}`);

    const userIds = await this.getEnrolledUserIds(courseId);

    if (userIds.length === 0) {
      return {
        message: 'No hay estudiantes inscritos en este curso',
        students: [],
        length: 0,
      };
    }

    const [users, participants, responseCounts] = await Promise.all([
      this.userModel
        .find({ _id: { $in: userIds } })
        .select('name email username avatar documentNumber isActive')
        .lean()
        .exec(),
      this.participantModel
        .find({ userId: { $in: userIds } })
        .lean()
        .exec(),
      this.userResponseModel
        .aggregate([
          // El campo es `user`; con `userId` la consulta devolvía siempre vacío.
          { $match: { user: { $in: userIds } } },
          { $group: { _id: '$user', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const participantByUser = new Map<string, any>(
      participants.map((p: any) => [String(p.userId), p]),
    );
    const responsesByUser = new Map<string, number>(
      responseCounts.map((r: any) => [String(r._id), r.count]),
    );

    const students = users.map((user: any) => {
      const participant = participantByUser.get(String(user._id)) ?? {};
      return {
        _id: participant._id?.toString() ?? String(user._id),
        userId: String(user._id),
        name: user.name || '—',
        email: user.email || '',
        username: user.username || '',
        documentNumber: user.documentNumber || '',
        avatar: user.avatar || '',
        isActive: user.isActive !== false,
        nickname: participant.nickname || '',
        points: participant.points || 0,
        level: participant.level || 'bronce',
        currentStreak: participant.currentStreak || 0,
        maxStreak: participant.maxStreak || 0,
        totalActivitiesCompleted: participant.totalActivitiesCompleted || 0,
        lastActivityDate: participant.lastActivityDate || null,
        activitiesResponded: responsesByUser.get(String(user._id)) ?? 0,
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
   *
   * Todas las cifras salen de la matrícula (`enrollments`). Antes «Activos»
   * significaba aquí «participantes con totalActivitiesCompleted > 0», mientras
   * la lista de estudiantes mostraba su estado de matrícula con la misma
   * palabra: de ahí «6 estudiantes, Activos: 1, los 6 aparecen como activo»
   * (informe del 4-nov-2026, hallazgo D-06).
   *
   * Contrato resultante, con cada cifra nombrada por lo que cuenta:
   *   totalStudents        inscritos (activo + completado; «retirado» fuera)
   *   activeStudents       matrícula en estado «activo»
   *   completedStudents    matrícula en estado «completado»
   *   withdrawnStudents    matrícula en estado «retirado»
   *   studentsWithActivity inscritos con al menos una respuesta registrada
   *   activityRate         studentsWithActivity / totalStudents
   *   completionRate       completedStudents / totalStudents
   */
  async getCourseProgressStats(courseId: string) {
    this.logger.log(`Fetching progress stats for course: ${courseId}`);

    const course = await this.courseModel.findById(courseId).lean().exec();
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const [
      totalStudents,
      activeStudents,
      completedStudents,
      withdrawnStudents,
      userIds,
    ] = await Promise.all([
      this.countEnrollments(courseId),
      this.countEnrollments(courseId, ['activo']),
      this.countEnrollments(courseId, ['completado']),
      this.countEnrollments(courseId, ['retirado']),
      this.getEnrolledUserIds(courseId),
    ]);

    const studentsWithActivity =
      await this.countEnrolledWithActivity(userIds);

    // Datos de participante solo para los inscritos que ya lo tienen.
    const participants = await this.participantModel
      .find({ userId: { $in: userIds } })
      .select('userId totalActivitiesCompleted points level')
      .lean()
      .exec();

    // Puntaje promedio sobre el total de inscritos: quien no tiene participante
    // cuenta como 0, igual que antes, para no inflar la media.
    const totalPoints = participants.reduce(
      (sum: number, p: any) => sum + (p.points || 0),
      0,
    );
    const avgPoints =
      totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;

    const levelDistribution: Record<string, number> = {};
    participants.forEach((p: any) => {
      const level = p.level || 'bronce';
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    });

    const percent = (part: number) =>
      totalStudents > 0 ? Math.round((part / totalStudents) * 100) : 0;

    return {
      courseId,
      courseName: (course as any).name,
      totalStudents,
      activeStudents,
      completedStudents,
      withdrawnStudents,
      inactiveStudents: withdrawnStudents,
      studentsWithActivity,
      avgPoints,
      totalPoints,
      levelDistribution,
      activityRate: percent(studentsWithActivity),
      completionRate: percent(completedStudents),
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
