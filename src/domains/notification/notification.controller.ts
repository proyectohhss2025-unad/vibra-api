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
  ApiTags
} from '@nestjs/swagger';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationService } from './notification.service';

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

  @ApiPropertyOptional()
  user?: string;

  @ApiPropertyOptional()
  participant?: string;

  @ApiProperty()
  notificationType: string;

  @ApiProperty()
  notificationChannel: string;

  @ApiProperty()
  priority: number;

  @ApiPropertyOptional()
  serial?: string;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  createdBy?: string;
}

class NotificationsPaginatedDto {
  @ApiProperty({ type: [NotificationDto] })
  data: NotificationDto[];

  @ApiProperty()
  total: number;
}

@ApiTags('Notifications')
@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

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

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'rows', required: false, example: 10 })
  @ApiOkResponse({ description: 'Listado de notificaciones.', schema: { type: 'array', items: { type: 'object' } } })
  async findAll(@Query() query: any) {
    return this.notificationService.findAll(query);
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
}
