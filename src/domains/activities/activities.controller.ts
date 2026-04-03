import {
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
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) { }

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
  @ApiOkResponse({ description: 'Listado paginado.', type: ActivitiesPaginatedDto })
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

  @Get('count-all-activities')
  @ApiOperation({
    summary: 'Obtener el número total de actividades',
    description:
      'Obtiene el número total de actividades registradas.',
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

  @Get('all')
  @ApiOperation({
    summary: 'Listar actividades (paginado)',
    description:
      'Obtiene actividades activas con paginación (sin filtro ni userId).',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ description: 'Listado paginado.', type: ActivitiesPaginatedDto })
  findAllWithPaginate(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.activitiesService.paginate({ page, limit }, null, {});
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
  submitResponse(
    @Param('id') activityId: string,
    @Param('userId') userId: string,
    @Body() responseDto: ActivityResponseDto,
  ) {
    return this.activitiesService.processResponse(
      userId,
      activityId,
      responseDto,
    );
  }
}
