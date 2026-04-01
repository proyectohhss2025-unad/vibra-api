import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CreateLoggerDto } from './dto/create-logger.dto';
import { FilterLoggerDto } from './dto/filter-logger.dto';
import { LoggerService } from './logger.service';

class LoggerRecordDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  method: string;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  status?: number;

  @ApiPropertyOptional()
  responseTime?: number;

  @ApiPropertyOptional()
  timestamp?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  origin?: string;
}

class LoggerSummaryMetaDto {
  @ApiProperty()
  totalLogs: number;

  @ApiProperty()
  totalPaginatedLogs: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;
}

class LoggerSummaryDto {
  @ApiProperty({ type: [LoggerRecordDto] })
  paginatedLogs: LoggerRecordDto[];

  @ApiProperty({ type: LoggerSummaryMetaDto })
  meta: LoggerSummaryMetaDto;
}

class LogRequestResponseDto {
  @ApiProperty({ example: 'Log saved successfully' })
  message: string;

  @ApiProperty({ type: LoggerRecordDto })
  logDetails: LoggerRecordDto;
}

@ApiTags('Logger')
@Controller('api/logger')
export class LoggerController {
  private readonly logger = new Logger(LoggerController.name);

  constructor(private readonly loggerService: LoggerService) {}

  /**
   * Controlador para registrar una petición con más información del participante.
   * @param req Request de Express.
   * @param res Response de Express.
   */
  @Post('request')
  @ApiOperation({
    summary: 'Registrar request manualmente',
    description:
      'Genera y almacena un log de la petición actual (método, URL, status, tiempos e información del cliente).',
  })
  @ApiOkResponse({ description: 'Log guardado.', type: LogRequestResponseDto })
  async logRequest(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      // Procesar la solicitud y capturar detalles
      const logDetails: CreateLoggerDto = {
        id: crypto.randomUUID(), // Generar un ID único para el log
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        ipAddress: req.headers['x-forwarded-for']?.toString() || req.ip,
        userAgent: req.headers['user-agent']?.toString() || 'Unknown',
        origin: req.headers['origin']?.toString() || 'Unknown',
      };

      // Guardar log en la base de datos
      await this.loggerService.saveLog(logDetails);

      // Responder al participante
      res.status(200).send({ message: 'Log saved successfully', logDetails });
    } catch (error) {
      this.logger.error(`Error logging request: ${error.message}`, error.stack);
      res.status(500).send({ message: 'Internal server error' });
    }
  }

  /**
   * Controlador para obtener un resumen de los logs con filtros y paginación.
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Obtener resumen de logs',
    description:
      'Retorna logs filtrados con paginación y metadatos agregados para reporting.',
  })
  @ApiQuery({ name: 'method', required: false, example: 'GET' })
  @ApiQuery({ name: 'url', required: false, example: '/api/users' })
  @ApiQuery({ name: 'status', required: false, example: 200 })
  @ApiQuery({ name: 'startTime', required: false, example: '2026-01-01T00:00:00.000Z' })
  @ApiQuery({ name: 'endTime', required: false, example: '2026-01-31T23:59:59.999Z' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiOkResponse({ description: 'Resumen de logs.', type: LoggerSummaryDto })
  async getLoggerSummary(@Query() filterDto: FilterLoggerDto) {
    try {
      // Obtener los logs filtrados y paginados desde el servicio
      const { paginatedLogs, totalPaginatedLogs, totalLogs } =
        await this.loggerService.getFilteredLogs(filterDto);

      // Calcular el total de páginas
      const totalPages = Math.ceil(totalLogs / (filterDto.limit || 100));

      // Responder con los datos
      return {
        paginatedLogs,
        meta: {
          totalLogs,
          totalPaginatedLogs,
          currentPage: filterDto.page || 1,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error in getLoggerSummary: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        { message: 'Internal server error', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene todos los logs
   */
  @Get()
  @ApiOperation({ summary: 'Listar logs' })
  @ApiOkResponse({ description: 'Listado de logs.', schema: { type: 'array', items: { type: 'object' } } })
  async getAllLogs() {
    try {
      return await this.loggerService.getAllLogs();
    } catch (error) {
      this.logger.error(
        `Error getting all logs: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        { message: 'Error retrieving logs', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /**
   * Obtiene todos los logs
   */
  @Get('filtered')
  @ApiOperation({
    summary: 'Listar logs (filtro libre)',
    description:
      'Permite filtrar logs usando parámetros de consulta, delegando el filtrado al servicio.',
  })
  @ApiOkResponse({ description: 'Listado de logs filtrados.', schema: { type: 'array', items: { type: 'object' } } })
  async getAllLogsFiltered(@Req() req: Request) {
    try {
      return await this.loggerService.getAllLogsFiltered(req);
    } catch (error) {
      this.logger.error(
        `Error getting all logs: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        { message: 'Error retrieving logs', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene un log por su ID
   * @param id ID del log a buscar
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener log por id' })
  @ApiParam({ name: 'id', description: 'ID del log.' })
  @ApiOkResponse({ description: 'Log encontrado.', type: LoggerRecordDto })
  async getLogById(@Param('id') id: string) {
    try {
      return await this.loggerService.getLogById(id);
    } catch (error) {
      this.logger.error(
        `Error getting log by ID: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw new HttpException(
          { message: error.message },
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        { message: 'Error retrieving log', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Elimina un log (marcado como eliminado)
   * @param id ID del log a eliminar
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar log' })
  @ApiParam({ name: 'id', description: 'ID del log.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { deletedBy: { type: 'string', example: 'admin' } },
    },
  })
  @ApiOkResponse({ description: 'Log eliminado.', schema: { type: 'object' } })
  async deleteLog(
    @Param('id') id: string,
    @Body('deletedBy') deletedBy: string,
  ) {
    try {
      return await this.loggerService.deleteLog(id, deletedBy || 'system');
    } catch (error) {
      this.logger.error(`Error deleting log: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw new HttpException(
          { message: error.message },
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        { message: 'Error deleting log', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
