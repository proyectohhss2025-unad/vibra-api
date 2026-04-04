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
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationService } from './notification.service';
import { NotificationTypeStatsDto } from './dto/notification-type-stats.dto';
import { MonthlyNotificationStatsDto } from './dto/monthly-notification-stats.dto';

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
  constructor(private readonly notificationService: NotificationService) { }

  @Post()
  @ApiOperation({ summary: 'Crear notificación' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiCreatedResponse({ description: 'Notificación creada.', type: NotificationDto })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Crear múltiples notificaciones' })
  @ApiBody({ type: [CreateNotificationDto] })
  @ApiCreatedResponse({ description: 'Notificaciones creadas.', schema: { type: 'array', items: { type: 'object' } } })
  async createMany(@Body() createNotificationDtos: CreateNotificationDto[]) {
    return this.notificationService.createMany(createNotificationDtos);
  }

  /**
   * Get all notifications with pagination
   * @param page - Page number
   * @param rows - Number of rows per page
   */
  @ApiOperation({ summary: 'Obtener todas las notificaciones con paginación' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', example: '1' })
  @ApiQuery({ name: 'rows', required: false, description: 'Número de filas por página', example: '10' })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones obtenida exitosamente' })
  @Get('all')
  async findAll(
    @Query('page') page: string = '1',
    @Query('rows') rows: string = '10',
  ) {
    return this.notificationService.getAll({ page, rows });
  }


  @Get('count-all-notifications')
  @ApiOperation({ summary: 'Contar todas las notificaciones' })
  @ApiOkResponse({ description: 'Conteo total de notificaciones.', schema: { type: 'number' } })
  async findCountAll(@Query() query: any) {
    return this.notificationService.getCountAll(query);
  }

  @Get('count-all-notifications-by-day')
  @ApiOperation({ summary: 'Contar notificaciones por día' })
  @ApiOkResponse({ description: 'Conteo total de notificaciones por día.', schema: { type: 'number' } })
  async findCountAllByDay(@Query() query: any) {
    return this.notificationService.getCountAllByDay(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener notificación por id' })
  @ApiParam({ name: 'id', description: 'ID de la notificación.' })
  @ApiOkResponse({ description: 'Notificación encontrada.', type: NotificationDto })
  async findOne(@Param('id') id: string) {
    return this.notificationService.getById(id);
  }

  @Get('title/:title')
  @ApiOperation({ summary: 'Obtener notificación por título' })
  @ApiParam({ name: 'title', description: 'Título de la notificación.' })
  @ApiOkResponse({ description: 'Notificación encontrada.', type: NotificationDto })
  async findByTitle(@Param('title') title: string) {
    return this.notificationService.getByTitle(title);
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

  @Get('search/:term')
  @ApiOperation({ summary: 'Buscar notificaciones por término' })
  @ApiParam({ name: 'term', description: 'Término de búsqueda.' })
  @ApiOkResponse({ description: 'Resultados de búsqueda.', schema: { type: 'array', items: { type: 'object' } } })
  async search(@Param('term') term: string) {
    return this.notificationService.search(term);
  }

  /**
  * Marks a notification as read.
  * @param id The ID of the notification to mark as read.
  * @returns The updated notification.
  */
  @Put('read/:id')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiParam({ name: 'id', description: 'ID de la notificación.' })
  @ApiBody({ schema: { type: 'object', properties: { editedBy: { type: 'string' } } } })
  @ApiOkResponse({ description: 'Notificación actualizada.', type: NotificationDto })
  async markAsRead(
    @Param('id') id: string,
    @Body('editedBy') editedBy: string,
  ) {
    return this.notificationService.markAsRead(id, editedBy);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar notificación' })
  @ApiParam({ name: 'id', description: 'ID de la notificación.' })
  @ApiBody({ type: UpdateNotificationDto })
  @ApiOkResponse({ description: 'Notificación actualizada.', type: NotificationDto })
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar notificación' })
  @ApiParam({ name: 'id', description: 'ID de la notificación.' })
  @ApiOkResponse({ description: 'Notificación eliminada.', type: NotificationDto })
  async remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }

  /**
   * Retrieves the count of unread notifications for a user.
   * @param id The ID of the user.
   * @returns The count of unread notifications.
   */
  @Get('unread/count/:id')
  @ApiOperation({ summary: 'Retrieve the count of unread notifications for a user', description: 'Fetches the count of unread notifications for a specific user.' })
  @ApiParam({ name: 'id', description: 'The ID of the user', type: 'number' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved the count of unread notifications.', type: Number })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUnreadCount(@Param('id') id: number): Promise<number> {
    return this.notificationService.getUnreadCountByUserId(id);
  }

}
