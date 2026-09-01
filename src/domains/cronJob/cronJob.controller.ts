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
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CronJobService } from './cronJob.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { UpdateCronJobDto } from './dto/update-cron-job.dto';

@ApiTags('Cron Jobs')
@Controller('api/cron-jobs')
export class CronJobController {
  constructor(private readonly cronJobService: CronJobService) {}

  // ─── CRUD ────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo job programado' })
  @ApiBody({ type: CreateCronJobDto })
  @ApiCreatedResponse({
    description: 'Job creado y registrado en el scheduler.',
  })
  create(@Body() dto: CreateCronJobDto) {
    return this.cronJobService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los jobs activos (no eliminados)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ description: 'Lista paginada de jobs.' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.cronJobService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar jobs por término' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'backup' })
  @ApiOkResponse({ description: 'Resultados de búsqueda.' })
  async search(
    @Query('searchTerm') searchTerm: string,
  ): Promise<{ data: any[] }> {
    const data = await this.cronJobService.search(searchTerm);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un job por ID' })
  @ApiParam({ name: 'id', description: 'ID del job' })
  @ApiOkResponse({ description: 'Job encontrado.' })
  findOne(@Param('id') id: string) {
    return this.cronJobService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar un job (cambia expresión, activo, config, etc.)',
  })
  @ApiParam({ name: 'id', description: 'ID del job' })
  @ApiBody({ type: UpdateCronJobDto })
  @ApiOkResponse({
    description: 'Job actualizado y resincronizado con el scheduler.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateCronJobDto) {
    return this.cronJobService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un job (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del job' })
  @ApiOkResponse({ description: 'Job eliminado y removido del scheduler.' })
  remove(@Param('id') id: string) {
    return this.cronJobService.remove(id);
  }

  // ─── CONTROL DE EJECUCIÓN ───────────────────────────────────────────

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Activar/Desactivar un job (toggle on/off)' })
  @ApiParam({ name: 'id', description: 'ID del job' })
  @ApiOkResponse({ description: 'Estado del job cambiado.' })
  toggle(@Param('id') id: string) {
    return this.cronJobService.toggle(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Ejecutar un job manualmente (ahora mismo)' })
  @ApiParam({ name: 'id', description: 'ID del job' })
  @ApiOkResponse({ description: 'Resultado de la ejecución manual.' })
  executeNow(@Param('id') id: string) {
    return this.cronJobService.executeNow(id);
  }

  // ─── TIPOS DE JOB ────────────────────────────────────────────────────

  @Get('types/list')
  @ApiOperation({ summary: 'Listar tipos de job disponibles para crear' })
  @ApiOkResponse({ description: 'Lista de tipos de job registrados.' })
  getAvailableTypes() {
    return this.cronJobService.getAvailableJobTypes();
  }

  // ─── HISTORIAL ───────────────────────────────────────────────────────

  @Get(':id/history')
  @ApiOperation({ summary: 'Obtener historial de ejecuciones de un job' })
  @ApiParam({ name: 'id', description: 'ID del job' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ description: 'Historial paginado de ejecuciones.' })
  getHistory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cronJobService.getExecutionHistory(
      id,
      page ? Number.parseInt(page, 10) : 1,
      limit ? Number.parseInt(limit, 10) : 20,
    );
  }
}
