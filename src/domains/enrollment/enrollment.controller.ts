import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';

@ApiTags('Enrollments')
@Controller('api/enrollments')
@RequirePermission('P-ENROLL-001')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  /**
   * Inscribir uno o varios estudiantes en un curso.
   * POST /api/enrollments
   */
  @Post()
  @RequirePermission('P-ENROLL-001')
  @ApiOperation({
    summary: 'Inscribir estudiantes en un curso',
    description:
      'Inscribe uno o varios estudiantes (User con role=Estudiante) en un curso. ' +
      'Si algún estudiante ya está inscrito, se omite sin error.',
  })
  @ApiBody({ type: CreateEnrollmentDto })
  @ApiResponse({
    status: 201,
    description: 'Estudiantes inscritos exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para este curso' })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  async create(@Body() dto: CreateEnrollmentDto, @Request() req: any) {
    const userId = req.user?.sub || req.user?._id;
    const userRoleName = req.user?.roleName || '';
    const userInstructorId = userId?.toString();
    return this.enrollmentService.create(
      dto,
      userId?.toString(),
      userRoleName,
      userInstructorId,
    );
  }

  /**
   * Retirar un estudiante de un curso (soft delete).
   * DELETE /api/enrollments/:id
   */
  @Delete(':id')
  @RequirePermission('P-ENROLL-002')
  @ApiOperation({
    summary: 'Retirar estudiante de un curso',
    description:
      'Cambia el estado de la inscripción a "retirado" (soft delete). ' +
      'El docente solo puede retirar estudiantes de sus propios cursos.',
  })
  @ApiParam({ name: 'id', description: 'ID del enrollment' })
  @ApiResponse({ status: 200, description: 'Estudiante retirado exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos para este curso' })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?._id;
    const userRoleName = req.user?.roleName || '';
    return this.enrollmentService.remove(id, userId?.toString(), userRoleName);
  }

  /**
   * Actualizar estado de una inscripción.
   * PATCH /api/enrollments/:id
   */
  @Patch(':id')
  @RequirePermission('P-ENROLL-002')
  @ApiOperation({
    summary: 'Actualizar estado de una inscripción',
    description:
      'Cambia el estado de una inscripción a: activo, completado o retirado. ' +
      'Si se marca como completado, se registra la fecha de finalización. ' +
      'El docente solo puede modificar inscripciones de sus propios cursos.',
  })
  @ApiParam({ name: 'id', description: 'ID del enrollment' })
  @ApiBody({ type: UpdateEnrollmentDto })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos para este curso' })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?._id;
    const userRoleName = req.user?.roleName || '';
    return this.enrollmentService.updateStatus(
      id,
      dto.status,
      userId?.toString(),
      userRoleName,
    );
  }

  /**
   * Listar estudiantes inscritos en un curso.
   * GET /api/enrollments/course/:courseId
   */
  @Get('course/:courseId')
  @RequirePermission('P-ENROLL-003')
  @ApiOperation({
    summary: 'Listar estudiantes inscritos en un curso',
    description:
      'Retorna la lista de estudiantes inscritos en un curso con datos de perfil. ' +
      'Opcionalmente filtra por estado y término de búsqueda.',
  })
  @ApiParam({ name: 'courseId', description: 'ID del curso' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por estado (activo, retirado, completado)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nombre, email o documento',
  })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes inscritos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para este curso' })
  async getByCourse(
    @Param('courseId') courseId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.sub || req?.user?._id;
    const userRoleName = req?.user?.roleName || '';
    return this.enrollmentService.getByCourse(
      courseId,
      userId?.toString(),
      userRoleName,
      status,
      search,
    );
  }

  /**
   * Obtener los cursos del estudiante autenticado.
   * GET /api/enrollments/my-courses
   */
  @Get('my-courses')
  @RequirePermission('P-ENROLL-004')
  @ApiOperation({
    summary: 'Cursos del estudiante autenticado',
    description:
      'Retorna los cursos activos y completados del estudiante logueado.',
  })
  @ApiResponse({ status: 200, description: 'Lista de cursos del estudiante' })
  async getMyCourses(@Request() req: any) {
    const userId = req.user?.sub || req.user?._id;
    return this.enrollmentService.getMyCourses(userId?.toString());
  }

  /**
   * Buscar estudiantes para el modal de asignación.
   * GET /api/enrollments/search-students?q=&excludeCourseId=
   */
  @Get('search-students')
  @RequirePermission('P-ENROLL-001')
  @ApiOperation({
    summary: 'Buscar estudiantes para inscribir',
    description:
      'Busca usuarios con rol Estudiante por nombre, email, documento o username. ' +
      'Si se proporciona excludeCourseId, excluye los ya inscritos en ese curso.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Término de búsqueda',
    example: 'carlos',
  })
  @ApiQuery({
    name: 'excludeCourseId',
    required: false,
    description: 'Excluir estudiantes ya inscritos en este curso',
  })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes encontrados' })
  async searchStudents(
    @Query('q') q: string,
    @Query('excludeCourseId') excludeCourseId?: string,
  ) {
    const data = await this.enrollmentService.searchStudents(
      q,
      excludeCourseId,
    );
    return { data };
  }
}
