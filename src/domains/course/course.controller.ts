import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAuthenticated } from 'src/infrastructure/auth/require-authenticated.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Courses')
@Controller('api/courses')
@RequirePermission('P-ADM-002')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  /**
   * Indica si el solicitante puede gestionar cualquier curso.
   *
   * `PermissionGuard` adjunta `req.userAuth` con el resultado de la
   * autorización: SuperAdmin o portador del serial `10` (gestión de cursos).
   */
  private isPrivileged(req: any): boolean {
    const auth = req?.userAuth;
    return (
      auth?.isSuperAdmin === true ||
      (Array.isArray(auth?.serials) && auth.serials.includes('10'))
    );
  }

  /**
   * Obtener lista simple de cursos (id, name) para selectores
   */
  @Get('list')
  @ApiOperation({
    summary: 'Lista simple de cursos',
    description:
      'Retorna una lista reducida de cursos activos con solo _id y name, para poblar selectores/combos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos obtenida exitosamente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f1a2b3c4d5e6f7g8h9i0j' },
          name: { type: 'string', example: 'Matemáticas 101' },
        },
      },
    },
  })
  async getSimpleList() {
    return this.courseService.getSimpleList();
  }

  /**
   * Obtener progreso de todos los cursos
   */
  @Get('progress')
  @ApiOperation({
    summary: 'Progreso de cursos',
    description:
      'Retorna el % de avance de cada curso basado en participantes que han completado al menos una actividad.',
  })
  @ApiResponse({
    status: 200,
    description: 'Progreso de cursos obtenido exitosamente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          courseId: { type: 'string', example: '65f1a2b3c4d5e6f7g8h9i0j' },
          courseName: { type: 'string', example: 'Matemáticas 101' },
          totalParticipants: { type: 'number', example: 30 },
          activeParticipants: { type: 'number', example: 22 },
          progressPercent: { type: 'number', example: 73 },
        },
      },
    },
  })
  async getProgress() {
    return this.courseService.getProgress();
  }

  /**
   * Crear un nuevo curso
   */
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo curso' })
  @ApiBody({ type: CreateCourseDto, description: 'Datos para crear un curso' })
  @ApiResponse({
    status: 201,
    description: 'Curso creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
  }

  /**
   * Obtener todos los cursos con filtros opcionales
   */
  @Get()
  @RequireAuthenticated()
  @ApiOperation({ summary: 'Listar todos los cursos' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filtrar por ID de compañía',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por estado (true/false)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: '1',
  })
  @ApiQuery({
    name: 'rows',
    required: false,
    description: 'Filas por página',
    example: '10',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos obtenida exitosamente',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('rows') rows?: string,
  ) {
    return this.courseService.findAll({
      companyId,
      status: status === 'true' ? true : status === 'false' ? false : undefined,
      page: page ? Number.parseInt(page) : 1,
      rows: rows ? Number.parseInt(rows) : 10,
    });
  }

  @RequireAuthenticated()
  @Get('search')
  @ApiOperation({ summary: 'Buscar por término' })
  @ApiQuery({ name: 'searchTerm', required: true })
  @ApiOkResponse({ description: 'Resultados de búsqueda.' })
  async search(
    @Query('searchTerm') searchTerm: string,
  ): Promise<{ data: any[] }> {
    const data = await this.courseService.search(searchTerm);
    return { data };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ENDPOINTS PARA DOCENTE — Monitoreo de cursos asignados
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Obtiene los cursos asignados al docente autenticado.
   * GET /api/courses/my-courses
   */
  @RequirePermission(['P-DOC-001', 'P-ADM-002'])
  @Get('my-courses')
  @ApiOperation({
    summary: 'Cursos del docente autenticado',
    description:
      'Retorna los cursos donde el docente autenticado está asignado como instructor, ' +
      'con conteo de estudiantes y progreso básico.',
  })
  @ApiOkResponse({
    description: 'Cursos del docente.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        courses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              studentCount: { type: 'number' },
              activeStudents: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getMyCourses(@Request() req: any) {
    const userId = req.user?.sub || req.user?._id;
    return this.courseService.findByInstructor(userId?.toString());
  }

  /**
   * Obtiene los estudiantes de un curso con su progreso.
   * GET /api/courses/:courseId/students
   */
  @RequirePermission(['P-DOC-001', 'P-ADM-002'])
  @Get(':courseId/students')
  @ApiOperation({
    summary: 'Estudiantes de un curso',
    description:
      'Retorna la lista de estudiantes inscritos en un curso, con datos de perfil y progreso.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'ID del curso',
    example: '65f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiOkResponse({ description: 'Lista de estudiantes del curso.' })
  async getCourseStudents(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ) {
    const userId = req?.user?.sub || req?.user?._id;
    await this.courseService.assertCanManageCourse(
      courseId,
      userId?.toString(),
      this.isPrivileged(req),
    );
    return this.courseService.getCourseStudents(courseId);
  }

  /**
   * Obtiene estadísticas agregadas de progreso de un curso.
   * GET /api/courses/:courseId/progress
   */
  @RequirePermission(['P-DOC-001', 'P-DOC-002', 'P-ADM-002'])
  @Get(':courseId/progress')
  @ApiOperation({
    summary: 'Estadísticas de progreso de un curso',
    description:
      'Retorna estadísticas agregadas: total estudiantes, activos, puntaje promedio, niveles.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'ID del curso',
    example: '65f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiOkResponse({ description: 'Estadísticas de progreso del curso.' })
  async getCourseProgress(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ) {
    const userId = req?.user?.sub || req?.user?._id;
    await this.courseService.assertCanManageCourse(
      courseId,
      userId?.toString(),
      this.isPrivileged(req),
    );
    return this.courseService.getCourseProgressStats(courseId);
  }

  /**
   * Obtener un curso por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un curso por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID del curso',
    example: '681f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiResponse({
    status: 200,
    description: 'Curso encontrado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Curso no encontrado',
  })
  async findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  /**
   * Actualizar un curso
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un curso' })
  @ApiParam({
    name: 'id',
    description: 'ID del curso',
    example: '681f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiBody({
    type: UpdateCourseDto,
    description: 'Datos para actualizar el curso',
  })
  @ApiResponse({
    status: 200,
    description: 'Curso actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Curso no encontrado',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.courseService.update(id, updateCourseDto);
  }

  /**
   * Eliminar un curso (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un curso' })
  @ApiParam({
    name: 'id',
    description: 'ID del curso',
    example: '681f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deletedBy: {
          type: 'string',
          description: 'ID del usuario que elimina',
        },
      },
    },
    description: 'Usuario que elimina el curso (opcional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Curso eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Curso no encontrado',
  })
  async remove(@Param('id') id: string, @Body('deletedBy') deletedBy?: string) {
    return this.courseService.remove(id, deletedBy);
  }

  /**
   * Obtener cursos por ID de compañía
   */
  @Get('company/:companyId')
  @ApiOperation({ summary: 'Listar cursos por institución' })
  @ApiParam({
    name: 'companyId',
    description: 'ID de la compañía/institución',
    example: '681f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiResponse({
    status: 200,
    description: 'Cursos de la institución obtenidos exitosamente',
  })
  async findByCompany(@Param('companyId') companyId: string) {
    return this.courseService.findByCompany(companyId);
  }
}
