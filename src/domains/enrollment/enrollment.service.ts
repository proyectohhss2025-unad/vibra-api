import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Enrollment, EnrollmentDocument } from './schemas/enrollment.schema';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { User } from '../users/schemas/user.schema';
import { Course } from '../course/schemas/course.schema';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectModel(Enrollment.name)
    private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
  ) {}

  /**
   * Inscribir uno o varios estudiantes en un curso.
   * Valida permisos, existencia de usuarios/curso, y evita duplicados.
   */
  async create(
    dto: CreateEnrollmentDto,
    createdByUserId: string,
    userRoleName: string,
    userInstructorId?: string,
  ) {
    const { courseId, studentIds } = dto;

    // 1. Validar que el curso exista
    const course = await this.courseModel
      .findOne({ _id: courseId, deleted: { $ne: true } })
      .exec();
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    // 2. Validar permisos: Docente solo puede inscribir en sus propios cursos
    if (userRoleName === 'Docente') {
      const instructorId = userInstructorId?.toString();
      if (
        !instructorId ||
        course.instructorId?.toString() !== instructorId
      ) {
        throw new ForbiddenException(
          'No tienes permisos para inscribir estudiantes en este curso',
        );
      }
    }

    // 3. Validar que los studentIds sean ObjectIds válidos
    const validIds = studentIds.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      throw new BadRequestException('No se proporcionaron IDs de estudiantes válidos');
    }

    // 4. Buscar usuarios y validar que tengan role=Estudiante
    const students = await this.userModel
      .find({
        _id: { $in: validIds.map((id) => new Types.ObjectId(id)) },
        deleted: { $ne: true },
      })
      .populate({ path: 'role', select: 'name' })
      .exec();

    if (students.length === 0) {
      throw new BadRequestException('No se encontraron estudiantes con los IDs proporcionados');
    }

    // Verificar que todos tengan rol Estudiante
    const validStudents = students.filter((s: any) => {
      const roleName =
        typeof s.role === 'object' && s.role !== null
          ? (s.role as any).name?.toLowerCase()
          : '';
      return roleName === 'estudiante';
    });

    if (validStudents.length === 0) {
      throw new BadRequestException(
        'Ninguno de los usuarios seleccionados tiene rol Estudiante',
      );
    }

    // 5. Verificar cupo máximo del curso
    if (course.maxStudents) {
      const currentCount = await this.enrollmentModel
        .countDocuments({
          courseId: new Types.ObjectId(courseId),
          status: 'activo',
        })
        .exec();
      const availableSlots = course.maxStudents - currentCount;
      if (availableSlots <= 0) {
        throw new BadRequestException(
          'El curso ha alcanzado el número máximo de estudiantes',
        );
      }
      if (validStudents.length > availableSlots) {
        throw new BadRequestException(
          `Solo hay ${availableSlots} cupos disponibles en este curso`,
        );
      }
    }

    // 6. Crear enrollments (los que ya existen se saltan por el índice unique)
    const createdByObjId = new Types.ObjectId(createdByUserId);
    const courseObjId = new Types.ObjectId(courseId);

    const created: any[] = [];
    const skipped: string[] = [];
    const errors: { id: string; reason: string }[] = [];

    for (const student of validStudents) {
      try {
        const enrollment = new this.enrollmentModel({
          userId: student._id,
          courseId: courseObjId,
          status: 'activo',
          createdBy: createdByObjId,
        });
        const saved = await enrollment.save();
        created.push({
          _id: saved._id,
          userId: student._id.toString(),
          name: student.name,
          email: student.email,
          documentNumber: student.documentNumber,
          status: saved.status,
          createdAt: saved.createdAt,
        });
      } catch (err: any) {
        if (err?.code === 11000) {
          // Duplicado por índice unique (userId + courseId)
          skipped.push(student._id.toString());
        } else {
          this.logger.error(
            `Error al inscribir estudiante ${student._id}: ${err.message}`,
          );
          errors.push({ id: student._id.toString(), reason: err.message });
        }
      }
    }

    this.logger.log(
      `Enrollments creados: ${created.length}, saltados: ${skipped.length}, errores: ${errors.length}`,
    );

    return {
      message: `Se inscribieron ${created.length} estudiante(s) exitosamente`,
      created,
      skipped,
      errors,
    };
  }

  /**
   * Retirar (soft delete) un estudiante de un curso.
   * Cambia status a 'retirado'.
   */
  async remove(enrollmentId: string, userId: string, userRoleName: string) {
    const enrollment = await this.enrollmentModel
      .findById(enrollmentId)
      .exec();
    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    // Docente solo puede retirar de sus propios cursos
    if (userRoleName === 'Docente') {
      const course = await this.courseModel
        .findById(enrollment.courseId)
        .exec();
      if (
        !course ||
        course.instructorId?.toString() !== userId?.toString()
      ) {
        throw new ForbiddenException(
          'No tienes permisos para retirar estudiantes de este curso',
        );
      }
    }

    enrollment.status = 'retirado';
    await enrollment.save();

    this.logger.log(
      `Enrollment ${enrollmentId} marcado como retirado por usuario ${userId}`,
    );

    return { message: 'Estudiante retirado del curso exitosamente' };
  }

  /**
   * Actualizar el estado de una inscripción.
   * Permite cambiar entre: activo, completado, retirado.
   * Si se marca como 'completado', se establece completedAt automáticamente.
   */
  async updateStatus(
    enrollmentId: string,
    newStatus: string,
    userId: string,
    userRoleName: string,
  ) {
    const enrollment = await this.enrollmentModel
      .findById(enrollmentId)
      .exec();
    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    // Docente solo puede cambiar estado de inscripciones en sus propios cursos
    if (userRoleName === 'Docente') {
      const course = await this.courseModel
        .findById(enrollment.courseId)
        .exec();
      if (
        !course ||
        course.instructorId?.toString() !== userId?.toString()
      ) {
        throw new ForbiddenException(
          'No tienes permisos para modificar inscripciones de este curso',
        );
      }
    }

    enrollment.status = newStatus;
    if (newStatus === 'completado') {
      enrollment.completedAt = new Date();
    } else if (newStatus === 'activo' && enrollment.completedAt) {
      // Si se reactiva, limpiar la fecha de completado
      enrollment.completedAt = null;
    }
    await enrollment.save();

    this.logger.log(
      `Enrollment ${enrollmentId} actualizado a estado ${newStatus} por usuario ${userId}`,
    );

    return {
      message: `Inscripción actualizada a "${newStatus}" exitosamente`,
      enrollment: {
        _id: enrollment._id,
        status: enrollment.status,
        completedAt: enrollment.completedAt,
      },
    };
  }

  /**
   * Listar estudiantes inscritos en un curso.
   */
  async getByCourse(
    courseId: string,
    userId: string,
    userRoleName: string,
    status?: string,
    search?: string,
  ) {
    // Docente solo puede ver estudiantes de sus propios cursos
    if (userRoleName === 'Docente') {
      const course = await this.courseModel
        .findById(courseId)
        .exec();
      if (
        !course ||
        course.instructorId?.toString() !== userId?.toString()
      ) {
        throw new ForbiddenException(
          'No tienes permisos para ver los estudiantes de este curso',
        );
      }
    }

    const query: any = {
      courseId: new Types.ObjectId(courseId),
    };
    if (status) {
      query.status = status;
    }

    const enrollments = await this.enrollmentModel
      .find(query)
      .populate({
        path: 'userId',
        select: 'name email username documentNumber avatar isActive',
        model: 'User',
      })
      .populate({
        path: 'createdBy',
        select: 'name',
        model: 'User',
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    let students = enrollments.map((enr: any) => ({
      _id: enr._id,
      enrollmentId: enr._id,
      userId: enr.userId?._id?.toString() || enr.userId?.toString(),
      name: enr.userId?.name || '—',
      email: enr.userId?.email || '',
      username: enr.userId?.username || '',
      documentNumber: enr.userId?.documentNumber || '',
      avatar: enr.userId?.avatar || '',
      isActive: enr.userId?.isActive !== false,
      status: enr.status,
      enrolledAt: enr.createdAt,
      enrolledBy: enr.createdBy?.name || '—',
    }));

    // Filtro local por búsqueda
    if (search) {
      const term = search.toLowerCase();
      students = students.filter(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term) ||
          s.documentNumber?.toLowerCase().includes(term),
      );
    }

    return {
      students,
      length: students.length,
    };
  }

  /**
   * Obtener los cursos del estudiante autenticado.
   */
  async getMyCourses(userId: string) {
    const enrollments = await this.enrollmentModel
      .find({
        userId: new Types.ObjectId(userId),
        status: { $in: ['activo', 'completado'] },
      })
      .populate({
        path: 'courseId',
        select: 'name description category startDate endDate status',
        model: 'Course',
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const courses = enrollments
      .filter((enr: any) => enr.courseId && enr.courseId.status !== false)
      .map((enr: any) => ({
        enrollmentId: enr._id,
        courseId: enr.courseId._id?.toString(),
        name: enr.courseId.name,
        description: enr.courseId.description,
        category: enr.courseId.category,
        startDate: enr.courseId.startDate,
        endDate: enr.courseId.endDate,
        status: enr.status,
        enrolledAt: enr.createdAt,
      }));

    return {
      courses,
      length: courses.length,
    };
  }

  /**
   * Buscar usuarios con rol Estudiante para el buscador.
   */
  async searchStudents(
    searchTerm: string,
    excludeCourseId?: string,
  ): Promise<Partial<User>[]> {
    // Buscar rol Estudiante por nombre
    const roleModel = this.userModel.db.model('Role');
    const role = await roleModel
      .findOne({
        name: { $regex: /^estudiante$/i },
        deleted: { $ne: true },
      })
      .exec();

    if (!role) {
      this.logger.warn('No se encontró el rol "Estudiante" en la base de datos');
      return [];
    }

    const regex = new RegExp(searchTerm, 'i');
    const query: any = {
      deleted: { $ne: true },
      role: role._id,
      $or: [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        { documentNumber: { $regex: regex } },
        { username: { $regex: regex } },
      ],
    };

    // Excluir estudiantes ya inscritos en un curso específico
    if (excludeCourseId && Types.ObjectId.isValid(excludeCourseId)) {
      const enrolledUserIds = await this.enrollmentModel
        .find({
          courseId: new Types.ObjectId(excludeCourseId),
          status: 'activo',
        })
        .distinct('userId')
        .exec();
      if (enrolledUserIds.length > 0) {
        query._id = { $nin: enrolledUserIds };
      }
    }

    return this.userModel
      .find(query)
      .limit(20)
      .select('name email documentNumber username avatar _id')
      .sort({ name: 1 })
      .exec();
  }
}
