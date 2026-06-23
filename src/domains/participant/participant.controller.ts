import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
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
import { BypassPermission } from 'src/infrastructure/auth/bypass-permission.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { CreateParticipantDto } from './dto/create-participant.dto';
import {
  UpdateParticipantDto,
  UpdatePointsDto,
} from './dto/update-participant.dto';
import { ParticipantService } from './participant.service';

// ─── DTOs para documentación Swagger ───

class ParticipantDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: '65f1a2b3c4d5e6f7' })
  userId: string;

  @ApiProperty({ example: 'vibrandor_01' })
  nickname: string;

  @ApiPropertyOptional({ example: 'https://...' })
  avatar?: string;

  @ApiProperty({ example: 150 })
  points: number;

  @ApiProperty({ example: 'plata' })
  level: string;

  @ApiProperty({ example: 5 })
  currentStreak: number;

  @ApiProperty({ example: 12 })
  maxStreak: number;

  @ApiProperty({ example: 25 })
  totalActivitiesCompleted: number;

  @ApiPropertyOptional({ example: '2026-05-23T12:00:00Z' })
  lastActivityDate?: Date;

  @ApiPropertyOptional({ example: '2026-05-23T10:00:00Z' })
  lastSessionDate?: Date;

  @ApiProperty({ example: true })
  isActive: boolean;
}

class UpdatePointsResponseDto {
  @ApiProperty({ example: 160 })
  points: number;

  @ApiProperty({ example: 'plata' })
  level: string;

  @ApiProperty({ example: 5 })
  currentStreak: number;

  @ApiProperty({ example: 12 })
  maxStreak: number;

  @ApiProperty({ example: 26 })
  totalActivitiesCompleted: number;

  @ApiPropertyOptional({ example: '2026-05-23T12:00:00Z' })
  lastActivityDate?: Date;
}

class ParticipantsListDto {
  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];

  @ApiProperty({ example: 120 })
  count: number;
}

@ApiTags('Participants')
@Controller('api/participants')
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  // ─── Crear participante ───
  @Post()
  @ApiOperation({ summary: 'Crear participante (desde registro de User)' })
  @ApiBody({ type: CreateParticipantDto })
  @ApiCreatedResponse({
    description: 'Participante creado.',
    type: ParticipantDto,
  })
  create(@Body() createParticipantDto: CreateParticipantDto) {
    return this.participantService.create(createParticipantDto);
  }

  // ─── Buscar participante por userId ───
  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Obtener participante por userId' })
  @ApiParam({ name: 'userId', description: 'ID del usuario (User)' })
  @ApiOkResponse({
    description: 'Participante encontrado.',
    type: ParticipantDto,
  })
  findByUserId(@Param('userId') userId: string) {
    return this.participantService.findByUserId(userId);
  }

  // ─── Actualizar puntos (actividad completada) ───
  @Patch(':id/points')
  @ApiOperation({
    summary:
      'Incrementar puntos y actualizar streak/level al completar actividad',
  })
  @ApiParam({ name: 'id', description: 'ID del participante' })
  @ApiBody({ type: UpdatePointsDto })
  @ApiOkResponse({
    description: 'Puntos actualizados.',
    type: UpdatePointsResponseDto,
  })
  updatePoints(
    @Param('id') id: string,
    @Body() updatePointsDto: UpdatePointsDto,
  ) {
    return this.participantService.updatePoints(id, updatePointsDto);
  }

  // ─── Historial de actividad por día ───
  @Get(':id/activity-history')
  @ApiOperation({
    summary: 'Obtener historial de actividades completadas por día',
  })
  @ApiParam({ name: 'id', description: 'ID del participante' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiOkResponse({ description: 'Historial de actividades por día.' })
  getActivityHistory(@Param('id') id: string, @Query('days') days?: number) {
    return this.participantService.getActivityHistory(id, days ?? 30);
  }

  // ─── Leaderboard del curso ───
  @Get('leaderboard')
  @ApiOperation({ summary: 'Obtener leaderboard de participantes por puntos' })
  @ApiQuery({ name: 'courseId', required: false, example: '65f1a2b3c4d5e6f7' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ description: 'Leaderboard del curso.' })
  getLeaderboard(
    @Query('courseId') courseId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.participantService.getLeaderboard(courseId, limit ?? 20);
  }

  // ─── Carga masiva CSV (legacy) ───
  @RequirePermission('9')
  @Post('bulk')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Carga masiva de participantes (CSV)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Participantes creados desde archivo.' })
  createMany(@UploadedFile() file: Express.Multer.File) {
    return this.participantService.createMany(file);
  }

  // ─── Listar participantes ───
  @RequirePermission('9')
  @Get()
  @ApiOperation({ summary: 'Listar participantes' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'rows', required: false, example: 10 })
  @ApiOkResponse({
    description: 'Listado de participantes.',
    type: ParticipantsListDto,
  })
  findAll(@Query() query: any) {
    return this.participantService.findAll(query);
  }

  // ─── Contar todos ───
  @BypassPermission()
  @Get('count-all-participants')
  @ApiOperation({ summary: 'Obtener el número total de participantes' })
  @ApiResponse({
    status: 200,
    description: 'Número total de participantes obtenido exitosamente',
  })
  findCountAll(@Query() query: any) {
    return this.participantService.getCountAll(query);
  }

  // ─── Buscar ───
  @RequirePermission('9')
  @Get('search')
  @ApiOperation({ summary: 'Buscar participantes' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'demo' })
  @ApiOkResponse({
    description: 'Resultados de búsqueda.',
    schema: { type: 'array', items: { type: 'object' } },
  })
  search(@Query('searchTerm') searchTerm: string) {
    return this.participantService.search(searchTerm);
  }

  // ─── Obtener por _id ───
  @RequirePermission('9')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener participante por _id' })
  @ApiParam({ name: 'id', description: 'ID del participante.' })
  @ApiOkResponse({
    description: 'Participante encontrado.',
    type: ParticipantDto,
  })
  findOne(@Param('id') id: string) {
    return this.participantService.findOne(id);
  }

  // ─── Actualizar ───
  @BypassPermission()
  @Post('update')
  @ApiOperation({ summary: 'Actualizar participante' })
  @ApiBody({ type: UpdateParticipantDto })
  @ApiOkResponse({
    description: 'Participante actualizado.',
    type: ParticipantDto,
  })
  update(@Body() updateParticipantDto: UpdateParticipantDto) {
    return this.participantService.update(updateParticipantDto);
  }

  // ─── Eliminar ───
  @RequirePermission('9')
  @Post('delete')
  @ApiOperation({ summary: 'Eliminar participante' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '66c9cce47e6a95e98116c0ab' },
      },
      required: ['_id'],
    },
  })
  @ApiOkResponse({
    description: 'Participante eliminado.',
    type: ParticipantDto,
  })
  remove(@Body('_id') id: string) {
    return this.participantService.remove(id);
  }

  // ─── Filtrar por fechas (legacy) ───
  @RequirePermission('9')
  @Get('filter')
  @ApiOperation({ summary: 'Listar participantes por rango de fechas' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-01-31' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiOkResponse({
    description: 'Listado filtrado.',
    type: ParticipantsListDto,
  })
  findAllWithDateFilter(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    const query: any = {};
    if (startDate || endDate) {
      query.dateFilter = {};
      if (startDate) query.dateFilter.startDate = new Date(startDate);
      if (endDate) query.dateFilter.endDate = new Date(endDate);
    }
    if (limit) query.limit = Number(limit);
    return this.participantService.findAll(query);
  }

  // ─── Paginado (legacy) ───
  @RequirePermission('9')
  @Get('paginated')
  @ApiOperation({ summary: 'Listar participantes (paginado)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({
    description: 'Listado paginado.',
    type: ParticipantsListDto,
  })
  findAllPaginated(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const query: any = {};
    if (page) query.page = Number(page);
    if (limit) query.rows = Number(limit);
    return this.participantService.findAll(query);
  }
}
