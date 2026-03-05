import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { RolesService } from './roles.service';
import { Role } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('Roles')
@Controller('api/roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    /**
     * Crea un nuevo rol
     */
    @Post()
    @ApiOperation({ summary: 'Crear un nuevo rol' })
    @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    async create(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.create(createRoleDto);
    }

    /**
     * Actualiza un rol existente
     */
    @Put()
    @ApiOperation({ summary: 'Actualizar un rol existente' })
    @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
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
    @ApiResponse({ status: 200, description: 'Lista de roles obtenida exitosamente' })
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
    async remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }

    /**
     * Carga múltiples roles desde un archivo CSV
     */
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Cargar múltiples roles desde un archivo CSV' })
    @ApiResponse({ status: 200, description: 'Roles cargados exitosamente' })
    @ApiResponse({ status: 400, description: 'Archivo no proporcionado o formato inválido' })
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
