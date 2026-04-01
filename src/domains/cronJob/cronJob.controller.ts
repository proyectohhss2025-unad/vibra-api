import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import { CronJobService } from './cronJob.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';

class CronJobDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ example: '0 0 * * *' })
  expression: string;

  @ApiProperty({ example: 'BACKUP_DB' })
  jobType: string;

  @ApiProperty({ example: true })
  active: boolean;
}

class CronJobExecutionResultDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'API call executed successfully' })
  message: string;
}

@ApiTags('Cron Jobs')
@Controller('api/cron-jobs')
export class CronJobController {
  constructor(private readonly cronJobService: CronJobService) {}

  @Post()
  @ApiOperation({ summary: 'Crear cron job' })
  @ApiBody({ type: CreateCronJobDto })
  @ApiCreatedResponse({ description: 'Cron job creado.', type: CronJobDto })
  create(@Body() createCronJobDto: CreateCronJobDto) {
    return this.cronJobService.create(createCronJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cron jobs' })
  @ApiOkResponse({ description: 'Listado de cron jobs.', type: [CronJobDto] })
  findAll() {
    return this.cronJobService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cron job por id' })
  @ApiParam({ name: 'id', description: 'ID del cron job.' })
  @ApiOkResponse({ description: 'Cron job encontrado.', type: CronJobDto })
  findOne(@Param('id') id: string) {
    return this.cronJobService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cron job' })
  @ApiParam({ name: 'id', description: 'ID del cron job.' })
  @ApiOkResponse({ description: 'Cron job eliminado.', type: CronJobDto })
  remove(@Param('id') id: string) {
    return this.cronJobService.remove(id);
  }

  @Post('execute-backup')
  @ApiOperation({
    summary: 'Ejecutar backup',
    description:
      'Ejecuta un respaldo de base de datos y genera una notificación de resultado.',
  })
  @ApiOkResponse({ description: 'Resultado de ejecución.', type: CronJobExecutionResultDto })
  executeBackup() {
    return this.cronJobService.executeBackup();
  }

  @Post('execute-api-call')
  @ApiOperation({
    summary: 'Ejecutar llamada API',
    description: 'Ejecuta una tarea tipo llamada API.',
  })
  @ApiOkResponse({ description: 'Resultado de ejecución.', type: CronJobExecutionResultDto })
  executeApiCall() {
    return this.cronJobService.executeApiCall();
  }
}
