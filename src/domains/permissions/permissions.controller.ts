import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { Permission } from './schemas/permission.schema';

@ApiTags('Permissions')
@Controller('api/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) { }

  @Get()
  @ApiOperation({ summary: 'Listar permisos' })
  @ApiResponse({ status: 200, description: 'Lista de permisos.', type: [Permission] })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener permiso por id' })
  @ApiProperty({ description: 'ID del permiso.' })
  @ApiResponse({ status: 200, description: 'Permiso encontrado.', type: Permission })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear permiso' })
  @ApiBody({ type: Permission })
  @ApiResponse({ status: 201, description: 'Permiso creado.', type: Permission })
  create(@Body() permission: Partial<Permission>) {
    return this.permissionsService.create(permission);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar permiso' })
  @ApiProperty({ description: 'ID del permiso.' })
  @ApiBody({ type: Permission })
  @ApiResponse({ status: 200, description: 'Permiso actualizado.', type: Permission })
  update(@Param('id') id: string, @Body() permission: Partial<Permission>) {
    return this.permissionsService.update(id, permission);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar permiso' })
  @ApiProperty({ description: 'ID del permiso.' })
  @ApiResponse({ status: 200, description: 'Permiso eliminado.', type: Permission })
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}