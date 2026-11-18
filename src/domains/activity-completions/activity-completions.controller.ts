import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { assertOwnership } from 'src/infrastructure/auth/ownership';
import { RequireAuthenticated } from 'src/infrastructure/auth/require-authenticated.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { ActivityCompletionsService } from './activity-completions.service';
import { CreateCompletionDto } from './dto/create-completion.dto';

@ApiTags('Activity Completions')
@ApiBearerAuth()
@Controller('api/activity-completions')
export class ActivityCompletionsController {
  constructor(
    private readonly completionsService: ActivityCompletionsService,
  ) {}

  @RequireAuthenticated()
  @Post()
  @ApiOperation({
    summary: 'Registrar completación de actividad',
    description:
      'Crea un registro de actividad completada por un participante, con puntaje planeado vs alcanzado.',
  })
  @ApiBody({ type: CreateCompletionDto })
  @ApiCreatedResponse({ description: 'Completación registrada.' })
  async create(@Req() req: any, @Body() dto: CreateCompletionDto) {
    // El participante debe pertenecer a la sesión
    const ownerId = await this.completionsService.getParticipantOwnerId(
      dto.participant,
    );
    assertOwnership(req, ownerId);
    return this.completionsService.create(dto);
  }

  @RequirePermission('P-EST-006')
  @Get('participant/:participantId')
  @ApiOperation({
    summary: 'Historial de completaciones de un participante',
    description:
      'Obtiene las actividades completadas por un participante con paginación.',
  })
  @ApiParam({ name: 'participantId', description: 'ID del participante' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ description: 'Historial de completaciones.' })
  findByParticipant(
    @Param('participantId') participantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.completionsService.findByParticipant(
      participantId,
      page ?? 1,
      limit ?? 20,
    );
  }

  @RequirePermission('P-EST-006')
  @Get('stats/:participantId')
  @ApiOperation({
    summary: 'Estadísticas de un participante',
    description:
      'Retorna total de participaciones, puntajes acumulados, promedio, mejor score, ranking y detalle por actividad.',
  })
  @ApiParam({ name: 'participantId', description: 'ID del participante' })
  @ApiOkResponse({ description: 'Estadísticas del participante.' })
  getStats(@Param('participantId') participantId: string) {
    return this.completionsService.getStats(participantId);
  }

  @RequirePermission('P-EST-003')
  @Get('today-count')
  @ApiOperation({
    summary: 'Completaciones de hoy',
    description:
      'Retorna el número de actividades completadas hoy + datos de la última completación.',
  })
  @ApiOkResponse({
    description:
      'count (total) y lastCompletion con datos del último en completar hoy.',
  })
  async getTodayCount() {
    return this.completionsService.getTodayCount();
  }

  @RequirePermission('P-EST-007')
  @Get('ranking')
  @ApiOperation({
    summary: 'Ranking global de participantes',
    description:
      'Retorna el ranking de participantes ordenados por puntaje acumulado.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ description: 'Ranking global.' })
  getRanking(@Query('limit') limit?: number) {
    return this.completionsService.getRanking(limit ?? 20);
  }

  @RequirePermission('P-EST-006')
  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de una completación',
    description: 'Obtiene el detalle de un registro de completación por ID.',
  })
  @ApiParam({ name: 'id', description: 'ID de la completación' })
  @ApiOkResponse({ description: 'Detalle de completación.' })
  findById(@Param('id') id: string) {
    return this.completionsService.findById(id);
  }
}
