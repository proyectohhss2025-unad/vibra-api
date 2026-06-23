import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { BypassPermission } from 'src/infrastructure/auth/bypass-permission.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { UserResponseService } from 'src/domains/userResponses/userResponse.service';
import { ActivitiesService } from './activities.service';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';

class EmotionSummaryDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: 'Alegría' })
  name: string;
}

class ActivityResourceDto {
  @ApiProperty({ example: 'video' })
  type: string;

  @ApiProperty({ example: 'https://cdn.vibra.com/resources/video-01.mp4' })
  url: string;

  @ApiPropertyOptional({ example: 120 })
  duration?: number;

  @ApiPropertyOptional({ example: { provider: 'cdn', quality: '720p' } })
  metadata?: Record<string, any>;
}

class ActivityQuestionDto {
  @ApiProperty({ example: 'Q1' })
  id: string;

  @ApiProperty({ example: '¿Cómo te sientes hoy?' })
  questionText: string;

  @ApiProperty({ example: 'multiple' })
  type: string;

  @ApiPropertyOptional({ example: ['Feliz', 'Triste', 'Ansioso'] })
  options?: string[];

  @ApiPropertyOptional({ example: 'Feliz' })
  correctAnswer?: string;

  @ApiProperty({ example: 5 })
  points: number;
}

class ActivityDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ad' })
  _id: string;

  @ApiProperty({ example: 'ACT-001' })
  id: string;

  @ApiPropertyOptional({ type: EmotionSummaryDto })
  emotion?: EmotionSummaryDto | string;

  @ApiProperty({ example: 'Respiración consciente' })
  title: string;

  @ApiPropertyOptional({
    example: 'Ejercicio breve para regular la emoción y enfocarte.',
  })
  description?: string;

  @ApiProperty({ type: [ActivityResourceDto] })
  resources: ActivityResourceDto[];

  @ApiProperty({ type: [ActivityQuestionDto] })
  questions: ActivityQuestionDto[];

  @ApiProperty({ example: 3 })
  difficulty: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

class ActivitiesPaginatedDto {
  @ApiProperty({ type: [ActivityDto] })
  docs: ActivityDto[];

  @ApiProperty({ example: 120 })
  totalDocs: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('api/activities')
@RequirePermission('16')
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly userResponseService: UserResponseService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una actividad',
    description:
      'Crea una actividad asociada a una emoción. Las actividades se usan para impulsar bienestar y participación estudiantil en Vibra.',
  })
  @ApiBody({ type: CreateActivityDto })
  @ApiCreatedResponse({ description: 'Actividad creada.', type: ActivityDto })
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.activitiesService.create(createActivityDto);
  }

  @BypassPermission()
  @Get()
  @ApiOperation({
    summary: 'Listar actividades (paginado + filtro por emoción)',
    description:
      'Obtiene actividades activas con paginación. Permite filtrar por emoción y enriquecer con respuestas del usuario si se envía userId.',
  })
  @ApiQuery({
    name: 'emotion',
    required: false,
    description: 'ID de emoción o "all" para no filtrar.',
    example: 'all',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description:
      'ID del usuario para incluir sus respuestas (si aplica) en la respuesta.',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({
    description: 'Listado paginado.',
    type: ActivitiesPaginatedDto,
  })
  findAll(
    @Query('emotion') emotion: string,
    @Query('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    //console.log({ page, limit, userId, emotion });
    return this.activitiesService.paginate(
      { page, limit },
      userId,
      emotion == 'all' ? {} : { emotion },
    );
  }

  @Get('by-month')
  @ApiOperation({
    summary: 'Obtener actividades completadas agrupadas por mes',
    description:
      'Retorna el conteo de user responses agrupadas por mes para un año específico. Útil para gráficas de participación.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    example: 2026,
    description: 'Año a consultar (default: año actual)',
  })
  @ApiQuery({
    name: 'courseId',
    required: false,
    description: 'Filtrar por curso',
  })
  @ApiOkResponse({
    description: 'Actividades por mes.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          month: { type: 'number', example: 1 },
          count: { type: 'number', example: 45 },
        },
      },
    },
  })
  getActivitiesByMonth(
    @Query('year') year?: number,
    @Query('courseId') courseId?: string,
  ) {
    return this.activitiesService.getActivitiesByMonth(
      year ?? new Date().getFullYear(),
      courseId,
    );
  }

  @BypassPermission()
  @Get('created-by-month')
  @ApiOperation({
    summary: 'Obtener actividades creadas agrupadas por mes',
    description:
      'Retorna el conteo de actividades creadas en el sistema agrupadas por mes para un año específico.',
  })
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  @ApiOkResponse({
    description: 'Actividades creadas por mes.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          month: { type: 'number', example: 1 },
          count: { type: 'number', example: 5 },
        },
      },
    },
  })
  getCreatedActivitiesByMonth(@Query('year') year?: number) {
    return this.activitiesService.getCreatedActivitiesByMonth(
      year ?? new Date().getFullYear(),
    );
  }

  @BypassPermission()
  @Get('count-all-activities')
  @ApiOperation({
    summary: 'Obtener el número total de actividades',
    description: 'Obtiene el número total de actividades registradas.',
  })
  @ApiOkResponse({
    description: 'Número total de actividades obtenidas exitosamente.',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 120 },
      },
    },
  })
  findCountAll(@Query() query: any) {
    return this.activitiesService.getCountAll(query);
  }

  @BypassPermission()
  @Get('count-by-type')
  @ApiOperation({
    summary: 'Contar actividades por tipo',
    description:
      'Retorna el número de actividades activas filtradas por tipo (reto, evento_personal, etc).',
  })
  @ApiQuery({ name: 'type', required: true, example: 'reto' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 3 },
      },
    },
  })
  async countByType(@Query('type') type: string) {
    const count = await this.activitiesService.countByType(type);
    return { count };
  }

  @BypassPermission()
  @Get('check-date')
  @ApiOperation({
    summary: 'Verificar si ya existe actividad para una fecha',
    description:
      'Retorna si ya hay una actividad programada para la fecha indicada. Útil para evitar duplicados en el formulario.',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    example: '2026-05-31',
    description: 'Fecha en formato YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'excludeId',
    required: false,
    description: 'ID de actividad a excluir (para edición)',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
      },
    },
  })
  async checkDate(
    @Query('date') date: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.activitiesService.checkDateExists(
      date,
      excludeId,
    );
    return { exists };
  }

  @Get('all')
  @ApiOperation({
    summary: 'Listar actividades (paginado)',
    description:
      'Obtiene actividades activas con paginación (sin filtro ni userId).',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({
    description: 'Listado paginado.',
    type: ActivitiesPaginatedDto,
  })
  findAllWithPaginate(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.activitiesService.paginate({ page, limit }, null, {});
  }

  @BypassPermission()
  @Get('search')
  @ApiOperation({ summary: 'Buscar actividades por término' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'título' })
  @ApiOkResponse({ description: 'Resultados de búsqueda.' })
  async search(
    @Query('searchTerm') searchTerm: string,
  ): Promise<{ data: any[] }> {
    const data = await this.activitiesService.search(searchTerm);
    return { data };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar una actividad por id',
    description: 'Obtiene una actividad por su id (ObjectId).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la actividad.',
    example: '66c9cce47e6a95e98116c0ad',
  })
  @ApiOkResponse({ description: 'Actividad encontrada.', type: ActivityDto })
  findOne(@Param('id') id: string) {
    return this.activitiesService.findById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar una actividad',
    description:
      'Actualiza una actividad por id. Permite activar/desactivar usando isActive.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la actividad.',
    example: '66c9cce47e6a95e98116c0ad',
  })
  @ApiBody({ type: UpdateActivityDto })
  @ApiOkResponse({ description: 'Actividad actualizada.', type: ActivityDto })
  update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, updateActivityDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Desactivar una actividad (soft delete)',
    description:
      'Desactiva una actividad estableciendo isActive=false. No elimina el documento.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la actividad.',
    example: '66c9cce47e6a95e98116c0ad',
  })
  @ApiOkResponse({ description: 'Actividad desactivada.', type: ActivityDto })
  remove(@Param('id') id: string) {
    return this.activitiesService.softDelete(id);
  }

  @BypassPermission()
  @Get('emotions/list')
  @ApiOperation({
    summary: 'Listar emociones disponibles (por actividades)',
    description:
      'Obtiene el listado de emociones (ids) disponibles según las actividades registradas.',
  })
  @ApiOkResponse({
    description: 'Listado de ids de emociones.',
    schema: { type: 'array', items: { type: 'string' } },
  })
  getAvailableEmotions() {
    return this.activitiesService.getAvailableEmotions();
  }

  @BypassPermission()
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Listar actividades de un usuario',
    description:
      'Retorna las actividades completadas por el usuario, opcionalmente filtradas por tipo.',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filtrar por tipo de actividad',
    enum: ['reto', 'evento_personal', 'actividad_pares', 'otro'],
    example: 'reto',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items por página',
    example: '10',
  })
  @ApiOkResponse({
    description: 'Lista de actividades del usuario',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getActivitiesByUser(
    @Param('userId') userId: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activitiesService.findByUserId(userId, {
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @BypassPermission()
  @Get('daily/current')
  @ApiOperation({
    summary: 'Obtener actividad del día',
    description:
      'Retorna la actividad activa creada para el día actual y su estado de agenda.',
  })
  @ApiOkResponse({
    description: 'Actividad diaria y estado.',
    schema: {
      type: 'object',
      properties: {
        activity: { type: 'object' },
        schedule: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date-time' },
            status: { type: 'string', example: 'active' },
          },
        },
      },
    },
  })
  getDailyActivity() {
    return this.activitiesService.getTodaysActivity();
  }

  @BypassPermission()
  @Post(':id/:userId/submit')
  @ApiOperation({
    summary: 'Registrar respuesta de un usuario a una actividad',
    description:
      'Procesa las respuestas de un usuario para una actividad y calcula/almacena el resultado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la actividad.',
    example: '66c9cce47e6a95e98116c0ad',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario.',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  @ApiBody({ type: ActivityResponseDto })
  @ApiOkResponse({
    description: 'Resultado del procesamiento de respuestas.',
    schema: { type: 'object' },
  })
  async submitResponse(
    @Param('id') activityId: string,
    @Param('userId') userId: string,
    @Body() responseDto: ActivityResponseDto,
  ) {
    if (!userId || userId === 'undefined' || userId === 'null') {
      throw new BadRequestException('El ID del usuario es requerido en la URL');
    }
    return this.activitiesService.processResponse(
      userId,
      activityId,
      responseDto,
    );
  }

  /**
   * Obtiene las respuestas de los usuarios para una actividad específica.
   * GET /api/activities/:id/responses
   */
  @BypassPermission()
  @Get(':id/responses')
  @ApiOperation({ summary: 'Obtener respuestas de usuarios a una actividad' })
  @ApiParam({ name: 'id', description: 'ID de la actividad (MongoDB _id)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filtrar por usuario',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Fecha inicio (ISO)',
  })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Fecha fin (ISO)' })
  @ApiOkResponse({ description: 'Listado paginado de respuestas.' })
  async getActivityResponses(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    return this.userResponseService.findByActivity(
      id,
      pageNum,
      limitNum,
      userId,
      dateFrom,
      dateTo,
    );
  }

  /**
   * Obtiene lista de usuarios que han respondido una actividad (para filtro).
   * GET /api/activities/:id/response-users
   */
  @BypassPermission()
  @Get(':id/response-users')
  @ApiOperation({ summary: 'Obtener usuarios que respondieron una actividad' })
  @ApiParam({ name: 'id', description: 'ID de la actividad (MongoDB _id)' })
  @ApiOkResponse({ description: 'Lista de usuarios.' })
  async getActivityResponseUsers(@Param('id') id: string) {
    return this.userResponseService.findUsersByActivity(id);
  }

  /**
   * Verifica si un usuario ya ha respondido una actividad.
   * GET /api/activities/:id/check-response?userId=xxx
   */
  @BypassPermission()
  @Get(':id/check-response')
  @ApiOperation({
    summary: 'Verificar si un usuario ya respondió una actividad',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad' })
  @ApiQuery({ name: 'userId', required: true, description: 'ID del usuario' })
  @ApiOkResponse({ description: 'Estado de la respuesta del usuario.' })
  async checkUserResponse(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.userResponseService.checkUserResponse(userId, id);
  }
}
