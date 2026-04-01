import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { UserPermissionsService } from './userPermissions.service';
import { UserPermission } from './schemas/userPermission.schema';
import { CreateUserPermissionDto } from './dto/create-user-permission.dto';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';

class UserPermissionDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  user: string;

  @ApiProperty()
  permission: string;

  @ApiPropertyOptional()
  serial?: string;

  @ApiPropertyOptional()
  isActive?: boolean;
}

@ApiTags('User Permissions')
@Controller('api/user-permissions')
export class UserPermissionsController {
  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar permisos asignados a usuarios' })
  @ApiOkResponse({ description: 'Listado de asignaciones.', type: [UserPermissionDto] })
  findAll() {
    return this.userPermissionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener asignación por id' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiOkResponse({ description: 'Asignación encontrada.', type: UserPermissionDto })
  findOne(@Param('id') id: string) {
    return this.userPermissionsService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener permisos por usuario' })
  @ApiParam({ name: 'userId', description: 'ID del usuario.' })
  @ApiOkResponse({ description: 'Asignaciones del usuario.', type: [UserPermissionDto] })
  findByUser(@Param('userId') userId: string) {
    return this.userPermissionsService.findByUser(userId);
  }

  @Get('permission/:permissionId')
  @ApiOperation({ summary: 'Obtener usuarios por permiso' })
  @ApiParam({ name: 'permissionId', description: 'ID del permiso.' })
  @ApiOkResponse({ description: 'Asignaciones del permiso.', type: [UserPermissionDto] })
  findByPermission(@Param('permissionId') permissionId: string) {
    return this.userPermissionsService.findByPermission(permissionId);
  }

  @Post()
  @ApiOperation({ summary: 'Asignar un permiso a un usuario' })
  @ApiBody({ type: CreateUserPermissionDto })
  @ApiCreatedResponse({ description: 'Asignación creada.', type: UserPermissionDto })
  create(@Body() userPermission: CreateUserPermissionDto) {
    return this.userPermissionsService.create(userPermission as unknown as Partial<UserPermission>);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar asignación' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiBody({ type: UpdateUserPermissionDto })
  @ApiOkResponse({ description: 'Asignación actualizada.', type: UserPermissionDto })
  update(
    @Param('id') id: string,
    @Body() userPermission: UpdateUserPermissionDto,
  ) {
    return this.userPermissionsService.update(id, userPermission as unknown as Partial<UserPermission>);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar asignación' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiOkResponse({ description: 'Asignación eliminada.', type: UserPermissionDto })
  remove(@Param('id') id: string) {
    return this.userPermissionsService.remove(id);
  }
}
