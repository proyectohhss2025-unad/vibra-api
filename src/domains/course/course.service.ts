import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

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
   * Obtener todos los cursos con filtros opcionales y paginación
   * @param filters - Filtros y paginación
   * @returns Lista de cursos
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

      return {
        message: 'Cursos obtenidos exitosamente',
        courses,
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
   * Obtener un curso por ID
   * @param id - ID del curso
   * @returns El curso
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

      return { message: 'Curso encontrado exitosamente', course };
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
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al actualizar el curso con ID ${id}`, error.stack);
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
}