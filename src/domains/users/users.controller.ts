import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { BypassPermission } from 'src/infrastructure/auth/bypass-permission.decorator';
import { Public } from 'src/infrastructure/auth/public.decorator';
import { RequireAuthenticated } from 'src/infrastructure/auth/require-authenticated.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { FileUploadService } from '../../infrastructure/file-upload/file-upload.service';
import { EventsGateway } from '../../infrastructure/sockets/events.gateway';
import {
  AvatarGalleryResponseDto,
  SelectAvatarDto
} from './dto/avatar-gallery.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

class UserCreateResponseDto {
  @ApiProperty({
    description: 'Nombre de usuario del usuario creado.',
    example: 'maya',
  })
  username: string;
}

class RoleSummaryDto {
  @ApiProperty({
    description: 'Identificador del rol.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  _id: string;

  @ApiProperty({
    description: 'Nombre del rol.',
    example: 'Administrador',
  })
  name: string;
}

class CompanySummaryDto {
  @ApiProperty({
    description: 'Identificador de la compañía/institución.',
    example: '66c9cce47e6a95e98116c0ac',
  })
  _id: string;

  @ApiProperty({
    description: 'Nombre de la compañía/institución.',
    example: 'Institución Demo',
  })
  name: string;
}

class UserDto {
  @ApiProperty({
    description: 'Identificador del usuario.',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  _id: string;

  @ApiPropertyOptional({
    description: 'Nombre completo del usuario.',
    example: 'Maya',
  })
  name?: string;

  @ApiProperty({
    description: 'Nombre de usuario único.',
    example: 'maya',
  })
  username: string;

  @ApiPropertyOptional({
    description: 'Número de documento del usuario.',
    example: '6803296',
  })
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento del usuario.',
    example: 'CC',
  })
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del usuario.',
    example: 'maya@vibra.local',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Indica si mantiene sesión activa.',
    example: true,
  })
  keepSessionActive?: boolean;

  @ApiPropertyOptional({
    description: 'Rol asociado (cuando está poblado).',
    type: RoleSummaryDto,
  })
  role?: RoleSummaryDto | string;

  @ApiPropertyOptional({
    description: 'Compañía asociada (cuando está poblada).',
    type: CompanySummaryDto,
  })
  company?: CompanySummaryDto | string;

  @ApiPropertyOptional({
    description: 'Avatar del usuario.',
    example: 'default-user.png',
  })
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Género del usuario.',
    example: 'MALE',
  })
  gender?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento (ISO string).',
    example: '2000-01-01T00:00:00.000Z',
  })
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Estado de conexión en tiempo real.',
    example: false,
  })
  isLogged?: boolean;

  @ApiPropertyOptional({
    description: 'Puntaje acumulado del usuario.',
    example: 0,
  })
  totalScore?: number;

  @ApiPropertyOptional({
    description: 'Serial interno del usuario.',
    example: 'USR-0001',
  })
  serial?: string;
}

class UsersPaginatedDto {
  @ApiProperty({
    description: 'Listado de usuarios.',
    type: [UserDto],
  })
  data: UserDto[];

  @ApiProperty({
    description: 'Total de registros.',
    example: 120,
  })
  total: number;
}

@ApiTags('Users')
@Controller('api/users')
@RequirePermission('P-ADM-001')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventsGateway: EventsGateway,
    private readonly jwtService: JwtService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Get('trigger')
  @ApiOperation({
    summary: 'Emitir un evento de prueba por WebSocket',
    description:
      'Emite un evento de ejemplo para validar la comunicación en tiempo real desde el backend hacia el dashboard.',
  })
  @ApiOkResponse({
    description: 'Evento emitido correctamente.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Evento emitido' },
      },
    },
  })
  triggerEvent() {
    const data = { message: '¡Evento generado desde el backend!' };
    this.eventsGateway.emitEvent(data);
    return { message: 'Evento emitido' };
  }

  @RequirePermission('P-ADM-001')
  @Post('create')
  @ApiOperation({
    summary: 'Crear un usuario (alta administrativa)',
    description:
      'Crea un nuevo usuario desde el dashboard de administración de participación estudiantil (Vibra). La contraseña se almacena con hash. ' +
      'Requiere sesión con permiso de gestión de usuarios y respeta el rol enviado en el payload. ' +
      'El registro público de estudiantes (rol Estudiante forzado y cuenta inactiva) se realiza en POST /api/auth/register, no aquí.',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'Datos requeridos para crear un usuario.',
  })
  @ApiCreatedResponse({
    description:
      'Usuario creado correctamente. Retorna el username del usuario creado.',
    type: UserCreateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o rol inexistente/eliminado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Sin permiso de gestión de usuarios, o intento de asignar un rol superior al del solicitante.',
  })
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    // Alta administrativa: el rol enviado se respeta. El registro público de
    // estudiantes vive en POST /api/auth/register (rol Estudiante + inactivo).
    return this.usersService
      .create(createUserDto, {
        isPublic: false,
        actorRoleName: req.user?.role?.name,
      })
      .then((response: User) => {
        if (response) {
          const data = {
            message: `Se ha registrado un nuevo usuario al sistema, Usuario: ${response.username}`,
          };
          this.eventsGateway.emitEvent(data);
          return { username: response.username };
        } else {
          return null;
        }
      });
  }

  @Patch('active')
  @ApiOperation({ summary: 'Activar/Desactivar un usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID del usuario' },
        active: { type: 'boolean', description: 'Estado activo/inactivo' },
        editedBy: {
          type: 'string',
          description: 'Usuario que realizó el cambio',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Estado actualizado exitosamente' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  async setActive(
    @Body('_id') id: string,
    @Body('active') active: boolean,
    @Body('editedBy') editedBy: string,
  ) {
    return this.usersService.setActive(id, active, editedBy);
  }

  /**
   * Actualiza el perfil del usuario autenticado (app mobile).
   * Ruta separada del alta/edición administrativa: no requiere permiso de
   * gestión de usuarios, pero solo permite tocar los datos propios.
   */
  @RequireAuthenticated()
  @Post('me')
  @ApiOperation({
    summary: 'Actualizar el perfil del usuario autenticado',
    description:
      'Permite a cualquier usuario con sesión válida actualizar sus propios datos personales ' +
      '(nombre, teléfono, dirección, fecha de nacimiento, género y avatar). ' +
      'No permite modificar rol, estado, institución, documento, email ni contraseña.',
  })
  @ApiBody({
    type: UpdateOwnProfileDto,
    description: 'Campos personales a actualizar.',
  })
  @ApiOkResponse({ description: 'Perfil actualizado correctamente.' })
  @ApiResponse({ status: 401, description: 'Sesión requerida.' })
  async updateMe(
    @Body() updateOwnProfileDto: UpdateOwnProfileDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?._id;
    return this.usersService.updateOwnProfile(userId, updateOwnProfileDto);
  }

  @RequirePermission('P-ADM-001')
  @Post()
  @ApiOperation({
    summary: 'Actualizar un usuario (gestión administrativa)',
    description:
      'Actualiza los datos de cualquier usuario por su _id. La contraseña se rehace con hash si se envía en el payload. ' +
      'Requiere sesión con permiso de gestión de usuarios. ' +
      'Para editar el propio perfil existe POST /api/users/me.',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Datos para actualizar un usuario.',
  })
  @ApiOkResponse({
    description: 'Usuario actualizado correctamente.',
    type: UserDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto de unicidad (por ejemplo, email duplicado) al actualizar el usuario.',
  })
  async update(@Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    return this.usersService.update(updateUserDto, {
      actorRoleName: req.user?.role?.name,
    });
  }

  @Get('all')
  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Obtiene el listado completo de usuarios registrados. Incluye el rol asociado.',
  })
  @ApiOkResponse({
    description: 'Listado de usuarios.',
    type: [UserDto],
  })
  async findAll() {
    return this.usersService.findAll();
  }

  // ─── Dashboard: estadísticas generales de usuarios ───
  @RequireAuthenticated()
  @Get('overview-stats')
  @ApiOperation({
    summary: 'Obtener total de usuarios + último usuario registrado',
    description:
      'Retorna count (total) y lastRegisteredUser con datos del último usuario creado en el sistema.',
  })
  @ApiOkResponse({
    description: 'Estadísticas generales de usuarios para el dashboard.',
  })
  getOverviewStats() {
    return this.usersService.getOverviewStats();
  }

  @RequireAuthenticated()
  @Get('count-all-users')
  @ApiOperation({
    summary: 'Obtener el número total de usuarios',
    description: 'Obtiene el número total de usuarios registrados.',
  })
  @ApiOkResponse({
    description: 'Número total de usuarios obtenido exitosamente.',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 120 },
      },
    },
  })
  findCountAll(@Query() query: any) {
    return this.usersService.getCountAll(query);
  }

  @Get('allPaginate')
  @ApiOperation({
    summary: 'Listar usuarios con paginación (respuesta encapsulada)',
    description:
      'Obtiene una página de usuarios y el total de registros. El backend retorna { data, total }. ' +
      'Sin `rows`, devuelve 8 elementos por página (máximo 100). Orden: más recientes primero.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'rows', required: false, example: 8 })
  @ApiOkResponse({
    description: 'Listado paginado de usuarios.',
    type: UsersPaginatedDto,
  })
  async findAllWithPaginate(
    @Query('page') page?: string,
    @Query('rows') rows?: string,
  ) {
    return this.usersService.findAllWithPaginate({ page, rows });
  }

  @Get('search/:username')
  @ApiOperation({
    summary: 'Consultar un usuario por username',
    description:
      'Busca un usuario por su username. Incluye rol y compañía si están asociados.',
  })
  @ApiParam({
    name: 'username',
    description: 'Nombre de usuario a buscar.',
    example: 'maya',
  })
  @ApiOkResponse({
    description: 'Usuario encontrado.',
    type: UserDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
  })
  async findOne(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @RequirePermission(['P-ADM-001', 'P-ACT-001', 'P-EVAL-001'])
  @Get('search')
  @ApiOperation({
    summary: 'Buscar usuarios por término',
    description:
      'Búsqueda de apoyo para las pantallas que necesitan elegir un usuario ' +
      '(gestión de usuarios, respuestas de actividades y respuestas de pre-tests). ' +
      'Requiere permiso 9, 16 o 15; no está disponible para estudiantes ni para peticiones anónimas.',
  })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'maya' })
  @ApiOkResponse({ description: 'Usuarios encontrados.', type: [UserDto] })
  @ApiResponse({ status: 403, description: 'Sin permiso para consultar usuarios.' })
  async search(
    @Query('searchTerm') searchTerm: string,
  ): Promise<{ data: Partial<User>[] }> {
    const data = await this.usersService.search(searchTerm);
    return { data };
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Obtener usuario por id' })
  @ApiParam({ name: 'id', description: 'ID del usuario.' })
  @ApiOkResponse({ description: 'Usuario encontrado.', type: UserDto })
  async findOneById(@Param('id') id: string) {
    return this.usersService.findByOne({ _id: id });
  }

  @Get('search-by-role/docentes')
  @ApiOperation({
    summary: 'Buscar usuarios con rol docente',
    description:
      'Busca usuarios cuyo rol sea "docente" por nombre, email, documento o username.',
  })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    description: 'Término de búsqueda',
    example: 'carlos',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Máximo de resultados',
    example: '10',
  })
  @ApiOkResponse({
    description: 'Lista de docentes encontrados.',
    type: [UserDto],
  })
  async searchDocentes(
    @Query('searchTerm') searchTerm: string = '',
    @Query('limit') limit: string = '10',
  ) {
    return this.usersService.searchByRole(
      'docente',
      searchTerm,
      parseInt(limit),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  AVATAR GALLERY ENDPOINTS
  // ═════════════════════════════════════════════════════════════════════════

  @RequirePermission('P-EST-005')
  @Get('avatar/gallery')
  @ApiOperation({
    summary: 'Obtener galería de avatares',
    description:
      'Retorna la galería de avatares del usuario autenticado y el avatar activo.',
  })
  @ApiOkResponse({
    description: 'Galería de avatares.',
    type: AvatarGalleryResponseDto,
  })
  async getAvatarGallery(
    @Request() req: any,
  ): Promise<AvatarGalleryResponseDto> {
    const userId = req.user?.sub || req.user?._id;
    return this.usersService.getAvatarGallery(userId);
  }

  @RequirePermission('P-EST-005')
  @Post('avatar/select')
  @ApiOperation({
    summary: 'Seleccionar avatar activo',
    description:
      'Marca un avatar de la galería como el avatar activo del usuario.',
  })
  @ApiBody({ type: SelectAvatarDto })
  @ApiOkResponse({
    description: 'Avatar activo actualizado.',
    schema: { properties: { avatar: { type: 'string' } } },
  })
  async selectAvatar(
    @Request() req: any,
    @Body() dto: SelectAvatarDto,
  ): Promise<{ avatar: string }> {
    const userId = req.user?.sub || req.user?._id;
    return this.usersService.selectAvatar(userId, dto.galleryId);
  }

  @RequirePermission('P-EST-005')
  @Post('avatar/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  @ApiOperation({
    summary: 'Subir imagen de avatar',
    description:
      'Sube una imagen (JPEG, PNG, GIF, WebP) a la galería de avatares del usuario.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPEG, PNG, GIF, WebP, máx 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Imagen subida y agregada a la galería.',
    schema: {
      properties: {
        galleryItem: { type: 'object' },
        avatar: { type: 'string' },
      },
    },
  })
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.sub || req.user?._id;
    return this.usersService.uploadAvatarImage(userId, file);
  }

  @RequirePermission('P-EST-005')
  @Delete('avatar/:galleryId')
  @ApiOperation({
    summary: 'Eliminar avatar de la galería',
    description:
      'Elimina un avatar subido (type=upload) de la galería del usuario.',
  })
  @ApiParam({
    name: 'galleryId',
    description: 'ID del item en avatarGallery a eliminar.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({ description: 'Item eliminado correctamente.' })
  async deleteAvatarItem(
    @Request() req: any,
    @Param('galleryId') galleryId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?._id;
    await this.usersService.deleteAvatarGalleryItem(userId, galleryId);
    return { message: 'Item eliminado correctamente' };
  }

  @BypassPermission()
  @Public()
  @Get('avatar/stream/:fileId')
  @ApiOperation({
    summary: 'Servir imagen de avatar desde GridFS',
    description:
      'Streaming público de una imagen subida a GridFS por su fileId.',
  })
  @ApiParam({
    name: 'fileId',
    description: 'ID del archivo en GridFS.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @ApiOkResponse({ description: 'Stream de la imagen.' })
  async streamAvatar(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const stream = await this.fileUploadService.getFileStream(fileId);
      // Todas las imágenes subidas se convierten a JPEG en la compresión
      stream.on('error', () => {
        if (!res.headersSent)
          res.status(404).json({ message: 'Imagen no encontrada' });
      });
      res.set('Content-Type', 'image/jpeg');
      stream.pipe(res);
    } catch {
      throw new NotFoundException('Imagen no encontrada');
    }
  }
}
