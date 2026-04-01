import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Company')
@Controller('api/company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /**
   * Create a new company
   * @param createCompanyDto - Data for creating a company
   */
  @ApiOperation({ summary: 'Crear una nueva compañía' })
  @ApiBody({ type: CreateCompanyDto, description: 'Datos para crear una compañía' })
  @ApiResponse({ status: 201, description: 'Compañía creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @Post()
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.create(createCompanyDto);
  }

  /**
   * Get all companies with pagination
   * @param page - Page number
   * @param rows - Number of rows per page
   */
  @ApiOperation({ summary: 'Obtener todas las compañías con paginación' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', example: '1' })
  @ApiQuery({ name: 'rows', required: false, description: 'Número de filas por página', example: '10' })
  @ApiResponse({ status: 200, description: 'Lista de compañías obtenida exitosamente' })
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('rows') rows: string = '10',
  ) {
    return this.companyService.findAll(Number.parseInt(page), parseInt(rows));
  }

  /**
   * Get a company by ID
   * @param id - Company ID
   */
  @ApiOperation({ summary: 'Obtener una compañía por ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la compañía' }
      }
    },
    description: 'ID de la compañía a buscar'
  })
  @ApiResponse({ status: 200, description: 'Compañía encontrada exitosamente' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  @Post('id')
  async findById(@Body('id') id: string) {
    return this.companyService.findById(id);
  }

  /**
   * Get the main company
   */
  @ApiOperation({ summary: 'Obtener la compañía principal' })
  @ApiResponse({ status: 200, description: 'Compañía principal obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Compañía principal no encontrada' })
  @Get('main')
  async findByIsMain() {
    return this.companyService.findByIsMain();
  }

  /**
   * Get a company by name
   * @param name - Company name
   */
  @ApiOperation({ summary: 'Obtener una compañía por nombre' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la compañía' }
      }
    },
    description: 'Nombre de la compañía a buscar'
  })
  @ApiResponse({ status: 200, description: 'Compañía encontrada exitosamente' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  @Post('name')
  async findByName(@Body('name') name: string) {
    return this.companyService.findByName(name);
  }

  /**
   * Update a company
   * @param updateCompanyDto - Data for updating the company
   */
  @ApiOperation({ summary: 'Actualizar una compañía' })
  @ApiBody({ type: UpdateCompanyDto, description: 'Datos para actualizar la compañía' })
  @ApiResponse({ status: 200, description: 'Compañía actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'ID de compañía requerido o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  @Patch()
  async update(@Body() updateCompanyDto: UpdateCompanyDto) {
    if (!updateCompanyDto._id) {
      throw new BadRequestException('Company ID is required');
    }
    return this.companyService.update(updateCompanyDto);
  }

  /**
   * Delete a company by ID
   * @param id - Company ID
   */
  @ApiOperation({ summary: 'Eliminar una compañía por ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la compañía a eliminar' }
      }
    },
    description: 'ID de la compañía a eliminar'
  })
  @ApiResponse({ status: 200, description: 'Compañía eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  @Delete()
  async remove(@Body('id') id: string) {
    return this.companyService.remove(id);
  }

  /**
   * Search companies by term
   * @param searchTerm - Search term
   * @param page - Page number
   * @param rows - Number of rows per page
   */
  @ApiOperation({ summary: 'Buscar compañías por término' })
  @ApiQuery({ name: 'searchTerm', required: true, description: 'Término de búsqueda' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', example: '1' })
  @ApiQuery({ name: 'rows', required: false, description: 'Número de filas por página', example: '10' })
  @ApiResponse({ status: 200, description: 'Búsqueda de compañías completada exitosamente' })
  @Get('search')
  async search(
    @Query('searchTerm') searchTerm: string,
    @Query('page') page: string = '1',
    @Query('rows') rows: string = '10',
  ) {
    return this.companyService.search(
      searchTerm,
      parseInt(page),
      parseInt(rows),
    );
  }

  /**
   * Set a company as active or inactive
   * @param id - Company ID
   * @param active - Active status
   * @param editedBy - User who edited the company
   */
  @ApiOperation({ summary: 'Establecer una compañía como activa o inactiva' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID de la compañía' },
        active: { type: 'boolean', description: 'Estado activo/inactivo' },
        editedBy: { type: 'string', description: 'ID del usuario que realizó la edición' }
      }
    },
    description: 'Datos para cambiar el estado de la compañía'
  })
  @ApiResponse({ status: 200, description: 'Estado de la compañía actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  @Patch('active')
  async setActive(
    @Body('_id') id: string,
    @Body('active') active: boolean,
    @Body('editedBy') editedBy: string,
  ) {
    return this.companyService.setActive(id, active, editedBy);
  }
}
