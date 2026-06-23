import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Query,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { EventsGateway } from '../../infrastructure/sockets/events.gateway';
import { BypassPermission } from 'src/infrastructure/auth/bypass-permission.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { Public } from 'src/infrastructure/auth/public.decorator';
import { FileUploadService } from '../../infrastructure/file-upload/file-upload.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';
import {
  SelectAvatarDto,
  AvatarGalleryResponseDto,
  AvatarGalleryItemDto,
} from './dto/avatar-gallery.dto';

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
@RequirePermission('9')
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

  @Post('create')
  @ApiOperation({
    summary: 'Crear un usuario',
    description:
      'Crea un nuevo usuario para el dashboard de administración de participación estudiantil (Vibra). La contraseña se almacena con hash.',
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
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto).then((response: User) => {
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

  @BypassPermission()
  @Post()
  @ApiOperation({
    summary: 'Actualizar un usuario',
    description:
      'Actualiza los datos de un usuario por su _id. La contraseña se rehace con hash si se envía en el payload.',
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
  async update(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(updateUserDto);
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

  @BypassPermission()
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
      'Obtiene usuarios y el total de registros. El backend retorna { data, total }.',
  })
  @ApiOkResponse({
    description: 'Listado paginado de usuarios.',
    type: UsersPaginatedDto,
  })
  async findAllWithPaginate() {
    return this.usersService.findAllWithPaginate();
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

  @BypassPermission()
  @Get('search')
  @ApiOperation({ summary: 'Buscar usuarios por término' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'maya' })
  @ApiOkResponse({ description: 'Usuarios encontrados.', type: [UserDto] })
  async search(
    @Query('searchTerm') searchTerm: string,
  ): Promise<{ data: Partial<User>[] }> {
    const data = await this.usersService.search(searchTerm);
    return { data };
  }

  @BypassPermission()
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

  @BypassPermission()
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

  @BypassPermission()
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

  @BypassPermission()
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

  @BypassPermission()
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
