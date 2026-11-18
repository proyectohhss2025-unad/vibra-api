import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
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
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAuthenticated } from 'src/infrastructure/auth/require-authenticated.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationService } from './notification.service';

class UserDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;
}

class NotificationTypeDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  level?: number;
}

class NotificationChannelDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;
}

class NotificationDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  ID: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  isRead?: boolean;

  @ApiPropertyOptional({ type: () => UserDto })
  user?: UserDto | string;

  @ApiProperty({ type: () => NotificationTypeDto })
  notificationType: NotificationTypeDto | string;

  @ApiProperty({ type: () => NotificationChannelDto })
  notificationChannel: NotificationChannelDto | string;

  @ApiProperty()
  priority: number;

  @ApiPropertyOptional()
  serial?: string;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  deleted?: boolean;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiPropertyOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  updatedAt?: string;

  @ApiPropertyOptional()
  editedBy?: string;

  @ApiPropertyOptional()
  editedAt?: string;

  @ApiPropertyOptional({ description: 'Acción que el cliente puede ejecutar' })
  action?: string;

  @ApiPropertyOptional({ description: 'Etiqueta visible de la acción' })
  actionLabel?: string;

  @ApiPropertyOptional({ description: 'Metadatos de la acción' })
  metadata?: Record<string, any>;
}

class NotificationsPaginatedDto {
  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty()
  length: number;
}

@ApiTags('Notifications')
@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /** ID del usuario autenticado (JWT) para filtrar la bandeja. */
  private currentUserId(req: any): string {
    return String(req?.user?.sub || req?.user?._id || '');
  }

  @Post()
  @ApiOperation({ summary: 'Crear notificación' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiCreatedResponse({
    description: 'Notificación creada.',
    type: NotificationDto,
  })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Crear múltiples notificaciones' })
  @ApiBody({ type: [CreateNotificationDto] })
  @ApiCreatedResponse({
    description: 'Notificaciones creadas.',
    schema: { type: 'array', items: { type: 'object' } },
  })
  async createMany(@Body() createNotificationDtos: CreateNotificationDto[]) {
    return this.notificationService.createMany(createNotificationDtos);
  }

  /**
   * Get all notifications with pagination
   * @param page - Page number
   * @param rows - Number of rows per page
   */
  @RequirePermission('P-EST-007')
  @ApiOperation({
    summary: 'Obtener las notificaciones del usuario autenticado con paginación',
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
    description: 'Número de filas por página',
    example: '10',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones obtenida exitosamente',
  })
  @Get('all')
  async findAll(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('rows') rows: string = '10',
  ) {
    return this.notificationService.getAll(
      { page, rows },
      this.currentUserId(req),
    );
  }

  @RequireAuthenticated()
  @Get('count-all-notifications')
  @ApiOperation({
    summary: 'Contar todas las notificaciones del usuario autenticado',
  })
  @ApiOkResponse({
    description: 'Conteo total de notificaciones del usuario.',
    schema: {
      type: 'object',
      properties: {
        countNotifications: { type: 'number', example: 12 },
        count: { type: 'number', example: 12 },
      },
    },
  })
  async findCountAll(@Request() req: any, @Query() query: any) {
    return this.notificationService.getCountAll(
      query,
      this.currentUserId(req),
    );
  }

  @RequireAuthenticated()
  @Get('count-all-notifications-by-day')
  @ApiOperation({
    summary: 'Contar notificaciones de hoy del usuario autenticado',
  })
  @ApiOkResponse({
    description: 'Conteo de notificaciones de hoy del usuario.',
    schema: {
      type: 'object',
      properties: {
        countNotifications: { type: 'number', example: 2 },
        count: { type: 'number', example: 2 },
      },
    },
  })
  async findCountAllByDay(@Request() req: any, @Query() query: any) {
    return this.notificationService.getCountAllByDay(
      query,
      this.currentUserId(req),
    );
  }

  @RequirePermission('P-EST-007')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener notificación por id' })
  @ApiParam({ name: 'id', description: 'ID de la notificación.' })
  @ApiOkResponse({
    description: 'Notificación encontrada.',
    type: NotificationDto,
  })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.getById(
      id,
      this.currentUserId(req),
      !!req?.userAuth?.isSuperAdmin,
    );
  }

  @RequirePermission('P-EST-007')
  @Get('title/:title')
  @ApiOperation({ summary: 'Obtener notificación por título' })
  @ApiParam({ name: 'title', description: 'Título de la notificación.' })
  @ApiOkResponse({
    description: 'Notificación encontrada.',
    type: NotificationDto,
  })
  async findByTitle(@Param('title') title: string, @Request() req: any) {
    return this.notificationService.getByTitle(
      title,
      this.currentUserId(req),
    );
  }

  @Post('batch/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Cargar CSV con notificaciones' })
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
  @ApiOkResponse({ description: 'Notificaciones creadas desde archivo.' })
  async uploadBatch(@UploadedFile() file: Express.Multer.File) {
    return this.notificationService.bulkCreate(file);
  }

  @RequirePermission('P-EST-007')
  @Get('search/:term')
  @ApiOperation({
    summary: 'Buscar notificaciones del usuario autenticado por término',
  })
  @ApiParam({ name: 'term', description: 'Término de búsqueda.' })
  @ApiOkResponse({
    description: 'Resultados de búsqueda.',
    schema: { type: 'array', items: { type: 'object' } },
  })
  async search(@Param('term') term: string, @Request() req: any) {
    return this.notificationService.search(
      term,
      this.currentUserId(req),
    );
  }

  /**
   * Marks a notification as read.
   * @param id The ID of the notification to mark as read.
   * @returns The updated notification.
   */
  @RequirePermission('P-EST-007')
  @Put('read/:id')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiParam({ name: 'id', description: 'ID de la notificación.' })
  @ApiBody({
    schema: { type: 'object', properties: { editedBy: { type: 'string' } } },
  })
  @ApiOkResponse({
    description: 'Notificación actualizada.',
    type: NotificationDto,
  })
  async markAsRead(
    @Param('id') id: string,
    @Body('editedBy') editedBy: string,
    @Request() req: any,
  ) {
    return this.notificationService.markAsRead(
      id,
      editedBy,
      this.currentUserId(req),
      !!req?.userAuth?.isSuperAdmin,
    );
  }

  @RequirePermission('P-EST-007')
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar notificación' })
  @ApiParam({ name: 'id', description: 'ID de la notificación.' })
  @ApiBody({ type: UpdateNotificationDto })
  @ApiOkResponse({
    description: 'Notificación actualizada.',
    type: NotificationDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Request() req: any,
  ) {
    return this.notificationService.update(
      id,
      updateNotificationDto,
      this.currentUserId(req),
      !!req?.userAuth?.isSuperAdmin,
    );
  }

  @RequirePermission('P-EST-007')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar notificación' })
  @ApiParam({ name: 'id', description: 'ID de la notificación.' })
  @ApiOkResponse({
    description: 'Notificación eliminada.',
    type: NotificationDto,
  })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.remove(
      id,
      this.currentUserId(req),
      !!req?.userAuth?.isSuperAdmin,
    );
  }

  /**
   * Conteo de notificaciones no leídas del usuario autenticado.
   */
  @RequireAuthenticated()
  @Get('unread/count')
  @ApiOperation({
    summary: 'Conteo de notificaciones no leídas del usuario autenticado',
  })
  @ApiOkResponse({
    description: 'Conteo de no leídas del usuario del token.',
    schema: { type: 'number', example: 3 },
  })
  async getMyUnreadCount(@Request() req: any): Promise<number> {
    return this.notificationService.getUnreadCountByUserId(
      this.currentUserId(req),
    );
  }

  /**
   * Compatibilidad: conteo de no leídas por id.
   * Sólo el propio usuario (o SuperAdmin) puede consultarlo.
   */
  @RequirePermission('P-EST-007')
  @Get('unread/count/:id')
  @ApiOperation({
    summary: 'Conteo de no leídas por usuario (compatibilidad)',
    description:
      'Sólo permite consultar el propio usuario; SuperAdmin puede consultar cualquiera.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Conteo de no leídas.',
    type: Number,
  })
  async getUnreadCount(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<number> {
    const currentUserId = this.currentUserId(req);
    if (String(id) !== currentUserId && !req?.userAuth?.isSuperAdmin) {
      throw new ForbiddenException(
        'No puedes consultar las notificaciones de otro usuario',
      );
    }
    return this.notificationService.getUnreadCountByUserId(id);
  }
}
