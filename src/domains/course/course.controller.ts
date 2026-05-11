import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Courses')
@Controller('api/courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

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
  @ApiOperation({ summary: 'Listar todos los cursos' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filtrar por ID de compañía' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado (true/false)' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', example: '1' })
  @ApiQuery({ name: 'rows', required: false, description: 'Filas por página', example: '10' })
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