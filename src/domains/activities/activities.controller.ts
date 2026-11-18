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
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserResponseService } from 'src/domains/userResponses/userResponse.service';
import { BypassPermission } from 'src/infrastructure/auth/bypass-permission.decorator';
import { RequireAuthenticated } from 'src/infrastructure/auth/require-authenticated.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
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
@RequirePermission('P-ACT-001')
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

  @RequireAuthenticated()
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
  @Get('overview-stats')
  @ApiOperation({
    summary: 'Estadísticas generales de actividades para el dashboard',
    description:
      'Retorna total de actividades activas, total de retos, última actividad creada y último reto creado.',
  })
  @ApiOkResponse({ description: 'Estadísticas generales de actividades.' })
  getOverviewStats() {
    return this.activitiesService.getOverviewStats();
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

  @RequirePermission('P-EST-003')
  @Get('check-date')
  @ApiOperation({
    summary: 'Verificar cuántas actividades hay en una fecha',
    description:
      'Retorna cuántas actividades hay programadas para la fecha indicada y si existe al menos una. Es informativo: se permiten varias actividades el mismo día.',
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
        exists: { type: 'boolean', example: true },
        count: { type: 'number', example: 2 },
      },
    },
  })
  async checkDate(
    @Query('date') date: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const count = await this.activitiesService.countActivitiesByDate(
      date,
      excludeId,
    );
    return { exists: count > 0, count };
  }

  @Get('schedule-counts')
  @ApiOperation({
    summary: 'Conteo de actividades por fecha',
    description:
      'Devuelve cuántas actividades hay en cada una de las fechas solicitadas. Sirve para señalar en el listado los días con varias actividades.',
  })
  @ApiQuery({
    name: 'dates',
    required: true,
    description: 'Lista de fechas separadas por coma en formato YYYY-MM-DD',
    example: '2026-05-31,2026-06-01',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        counts: {
          type: 'object',
          additionalProperties: { type: 'number' },
          example: { '2026-05-31': 3 },
        },
      },
    },
  })
  async scheduleCounts(@Query('dates') dates?: string) {
    const list = String(dates || '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    return { counts: await this.activitiesService.countActivitiesByDates(list) };
  }

  @Get('all')
  @ApiOperation({
    summary: 'Listar actividades (paginado)',
    description:
      'Obtiene actividades con paginación (sin filtro ni userId). Incluye actividades activas e inactivas para la gestión del dashboard. Soporta filtros por tipo y estado.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['all', 'reto', 'evento_personal', 'actividad_diaria', 'otro'],
    description: 'Filtrar por tipo de actividad (default: all).',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    enum: ['all', 'active', 'inactive'],
    description: 'Filtrar por estado (default: all).',
  })
  @ApiOkResponse({
    description: 'Listado paginado.',
    type: ActivitiesPaginatedDto,
  })
  findAllWithPaginate(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type: string = 'all',
    @Query('isActive') isActive: string = 'all',
  ) {
    // Vista de gestión (admin/dashboard): traer TODAS las actividades
    // (activas e inactivas). El paginate por defecto filtra isActive: true
    // (pensado para la app del estudiante); aquí se sobreescribe para que
    // el dashboard pueda listar y gestionar las inactivas.
    const query: any = {};
    if (type && type !== 'all') query.type = type;
    if (isActive === 'active') query.isActive = true;
    else if (isActive === 'inactive') query.isActive = false;
    else query.isActive = { $in: [true, false] };

    return this.activitiesService.paginate({ page, limit }, null, query);
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

  @RequireAuthenticated()
  @Get('today')
  @ApiOperation({
    summary: 'Actividades disponibles para hoy',
    description:
      'Lista las Actividades Diarias (`type: actividad_diaria`) activas programadas para la fecha actual (día Colombia) y las que no tienen fecha de programación (disponibles siempre hasta completarse). Por defecto sólo devuelve ese tipo; use `type=all` para todos los tipos. Si se envía userId, cada actividad incluye si el usuario ya la completó y su puntaje.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'ID del usuario para marcar actividades completadas',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['all', 'actividad_diaria', 'reto', 'evento_personal', 'otro'],
    description:
      'Filtra por tipo. Por defecto devuelve sólo Actividad Diaria (actividad_diaria); ' +
      'use type=all para ver todos los tipos (vistas administrativas).',
  })
  @ApiOkResponse({
    description: 'Listado de actividades del día y su estado.',
    schema: {
      type: 'object',
      properties: {
        activities: { type: 'array', items: { type: 'object' } },
        count: { type: 'number', example: 2 },
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
  getTodayActivities(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
  ) {
    return this.activitiesService.getTodaysActivities(userId, { type });
  }

  @RequireAuthenticated()
  @Get('my-history')
  @ApiOperation({
    summary: 'Historial del participante (actividades respondidas o completadas)',
    description:
      'Une las respuestas a preguntas (UserResponse) y las completaciones de juegos ' +
      '(ActivityCompletion) del usuario autenticado. Devuelve estado por actividad ' +
      '(completada | en_progreso), puntaje y los conteos reales del historial.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Máximo de actividades a devolver (default 100)',
  })
  @ApiOkResponse({
    description: 'Historial del participante con conteos.',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        counts: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 7 },
            completed: { type: 'number', example: 5 },
            inProgress: { type: 'number', example: 2 },
          },
        },
      },
    },
  })
  getMyHistory(@Request() req: any, @Query('limit') limit?: string) {
    // El usuario sale del token: no se acepta un userId arbitrario por query.
    const userId = req?.user?.sub || req?.user?._id;
    const parsedLimit = Number(limit);
    return this.activitiesService.getMyHistory(userId?.toString(), {
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100,
    });
  }

  @RequireAuthenticated()
  @Get('my-board')
  @ApiOperation({
    summary: 'Tablero del participante (pendientes, en progreso y completadas)',
    description:
      'Devuelve todas las actividades activas de un tipo con su estado para el usuario autenticado: ' +
      'pendiente (sin respuestas), en_progreso (respondió algunas preguntas) o completada. ' +
      'Incluye conteos para las tarjetas de Retos y E-Personal.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description:
      'Filtra por tipo: reto | evento_personal | actividad_diaria | otro',
  })
  @ApiOkResponse({
    description: 'Actividades con estado y conteos.',
    schema: {
      type: 'object',
      properties: {
        activities: { type: 'array', items: { type: 'object' } },
        counts: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            pending: { type: 'number', example: 2 },
            inProgress: { type: 'number', example: 1 },
            completed: { type: 'number', example: 2 },
          },
        },
      },
    },
  })
  getMyBoard(@Request() req: any, @Query('type') type?: string) {
    // El usuario sale del token: no se acepta un userId arbitrario por query.
    const userId = req?.user?.sub || req?.user?._id;
    return this.activitiesService.getActivityBoard(userId?.toString(), {
      type,
    });
  }

  @Get('daily-coverage')
  @ApiOperation({
    summary: 'Cobertura de Actividad Diaria',
    description:
      'Cuenta las Actividades Diarias (`actividad_diaria`) activas programadas por día en un rango ' +
      '(por defecto, la semana actual lunes-domingo en Colombia). Las Actividades Diarias sin fecha ' +
      'cubren todos los días porque quedan disponibles hasta completarse.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Fecha inicial YYYY-MM-DD (default: lunes de la semana actual)',
    example: '2026-10-26',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Fecha final YYYY-MM-DD (default: domingo de la semana actual)',
    example: '2026-11-01',
  })
  @ApiOkResponse({
    description: 'Cobertura por día y resumen del rango.',
    schema: {
      type: 'object',
      properties: {
        from: { type: 'string', example: '2026-10-26' },
        to: { type: 'string', example: '2026-11-01' },
        days: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2026-10-26' },
              count: { type: 'number', example: 1 },
              covered: { type: 'boolean', example: true },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalDays: { type: 'number', example: 7 },
            coveredDays: { type: 'number', example: 5 },
            missingDays: { type: 'number', example: 2 },
            percentage: { type: 'number', example: 71 },
          },
        },
        undatedCount: { type: 'number', example: 0 },
      },
    },
  })
  getDailyCoverage(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.activitiesService.getDailyActivityCoverage({ from, to });
  }

  @RequireAuthenticated()
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

  @RequireAuthenticated()
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

  @RequireAuthenticated()
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
    enum: ['reto', 'evento_personal', 'actividad_diaria', 'otro'],
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

  @RequireAuthenticated()
  @Get('available/:userId')
  @ApiOperation({
    summary: 'Listar actividades disponibles de un usuario',
    description:
      'Retorna las actividades activas que el usuario aún no ha respondido, opcionalmente filtradas por tipo. Se usa en las tabs de Retos y E-Personal del mobile.',
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
    enum: ['reto', 'evento_personal', 'actividad_diaria', 'otro'],
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
    description: 'Lista de actividades disponibles del usuario',
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
  async getAvailableActivitiesByUser(
    @Param('userId') userId: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activitiesService.findAvailableByUser(userId, {
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @RequireAuthenticated()
  @Get('daily/current')
  @ApiOperation({
    summary: 'Obtener actividad del día',
    description:
      'Retorna la Actividad Diaria (tipo `actividad_diaria`) activa creada para el día actual y su estado de agenda.',
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

  @RequirePermission('P-EST-004')
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
  @RequirePermission('P-EST-006')
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
  @RequireAuthenticated()
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
    const status = await this.userResponseService.checkUserResponse(userId, id);
    if (!status?.alreadyResponded) return status;

    // La actividad se responde pregunta a pregunta: se considera completada
    // sólo cuando existe una respuesta por cada pregunta de la actividad.
    const activity = await this.activitiesService.findById(id);
    const questionsCount = activity?.questions?.length || 0;
    if (questionsCount > 0 && (status.answeredCount || 0) < questionsCount) {
      return { ...status, alreadyResponded: false };
    }

    return status;
  }
}
