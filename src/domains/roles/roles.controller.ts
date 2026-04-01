import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { RolesService } from './roles.service';
import { Role } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationDto } from './dto/pagination.dto';

class PermissionTemplateSummaryDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0aa' })
  _id: string;

  @ApiProperty({ example: 'Administrador Vibra' })
  name: string;
}

class RoleDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: 'Administrador' })
  name: string;

  @ApiProperty({ example: 'Rol para administración del dashboard Vibra.' })
  description: string;

  @ApiPropertyOptional({ type: PermissionTemplateSummaryDto })
  permissionTemplate?: PermissionTemplateSummaryDto | string;

  @ApiProperty({ example: false })
  isSuperAdmin: boolean;

  @ApiPropertyOptional({ example: 'ROLE-0002' })
  serial?: string;

  @ApiPropertyOptional({ example: true })
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'seed' })
  createdBy?: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  createdAt?: string;
}

class RolePaginationMetaDto {
  @ApiProperty({ example: 50 })
  totalItems: number;

  @ApiProperty({ example: 10 })
  itemsPerPage: number;

  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

class RolesPaginatedDto {
  @ApiProperty({ type: [RoleDto] })
  items: RoleDto[];

  @ApiProperty({ type: RolePaginationMetaDto })
  meta: RolePaginationMetaDto;
}

@ApiTags('Roles')
@Controller('api/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Crea un nuevo rol
   */
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ApiBody({ type: CreateRoleDto })
  @ApiCreatedResponse({ description: 'Rol creado exitosamente', type: RoleDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  /**
   * Actualiza un rol existente
   */
  @Put()
  @ApiOperation({ summary: 'Actualizar un rol existente' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiOkResponse({ description: 'Rol actualizado exitosamente', type: RoleDto })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  async update(@Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(updateRoleDto);
  }

  /**
   * Método legacy para mantener compatibilidad
   */
  @Post('updateKeepSessionActive')
  async updateKeepSessionActive(@Body() createRoleDto: Role) {
    return this.rolesService.updateKeepSessionActive(createRoleDto);
  }

  /**
   * Obtiene todos los roles con paginación
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todos los roles con paginación' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  @ApiOkResponse({ type: RolesPaginatedDto })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.rolesService.findAll(paginationDto);
  }

  /**
   * Obtiene un rol por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un rol por su ID' })
  @ApiResponse({ status: 200, description: 'Rol encontrado' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiParam({ name: 'id', description: 'ID del rol.', example: '66c9cce47e6a95e98116c0ab' })
  @ApiOkResponse({ type: RoleDto })
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  /**
   * Obtiene un rol por su nombre
   */
  @Get('name/:name')
  @ApiOperation({ summary: 'Obtener un rol por su nombre' })
  @ApiResponse({ status: 200, description: 'Rol encontrado' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiParam({ name: 'name', description: 'Nombre del rol.', example: 'Administrador' })
  @ApiOkResponse({ type: RoleDto })
  async findByName(@Param('name') name: string) {
    return this.rolesService.findByName(name);
  }

  /**
   * Elimina un rol por su ID
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un rol' })
  @ApiResponse({ status: 200, description: 'Rol eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiParam({ name: 'id', description: 'ID del rol.', example: '66c9cce47e6a95e98116c0ab' })
  @ApiOkResponse({ type: RoleDto })
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  /**
   * Carga múltiples roles desde un archivo CSV
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Cargar múltiples roles desde un archivo CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Roles cargados exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Archivo no proporcionado o formato inválido',
  })
  async uploadRoles(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    try {
      const fileContent = readFileSync(file.path, 'utf8');
      const rolesData = parse(fileContent, { columns: true });
      const roles: Partial<Role>[] = [];

      for (const row of rolesData) {
        const role: Partial<Role> = {
          serial: row['serial'],
          name: row['name'],
          description: row['description'],
          isSuperAdmin: false,
          createdAt: new Date(),
          createdBy: row['createdBy'],
        };
        roles.push(role);
      }

      await this.rolesService.insertMany(roles);
      return { message: 'Roles inserted successfully' };
    } catch (error) {
      return { error: 'Failed to insert roles', details: error.message };
    }
  }
}
