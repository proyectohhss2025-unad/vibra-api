import { Body, Controller, Delete, Get, HttpException, HttpStatus, Logger, NotFoundException, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CreateLoggerDto } from './dto/create-logger.dto';
import { FilterLoggerDto } from './dto/filter-logger.dto';
import { LoggerService } from './logger.service';

@Controller('api/logger')
export class LoggerController {
    private readonly logger = new Logger(LoggerController.name);

    constructor(private readonly loggerService: LoggerService) { }

    /**
     * Controlador para registrar una petición con más información del cliente.
     * @param req Request de Express.
     * @param res Response de Express.
     */
    @Post('request')
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
                ipAddress: req.headers["x-forwarded-for"]?.toString() || req.ip,
                userAgent: req.headers["user-agent"]?.toString() || "Unknown",
                origin: req.headers["origin"]?.toString() || "Unknown",
            };

            // Guardar log en la base de datos
            await this.loggerService.saveLog(logDetails);

            // Responder al cliente
            res.status(200).send({ message: "Log saved successfully", logDetails });
        } catch (error) {
            this.logger.error(`Error logging request: ${error.message}`, error.stack);
            res.status(500).send({ message: "Internal server error" });
        }
    }

    /**
     * Controlador para obtener un resumen de los logs con filtros y paginación.
     */
    @Get('summary')
    async getLoggerSummary(@Query() filterDto: FilterLoggerDto) {
        try {
            // Obtener los logs filtrados y paginados desde el servicio
            const { paginatedLogs, totalPaginatedLogs, totalLogs } = await this.loggerService.getFilteredLogs(filterDto);

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
            this.logger.error(`Error in getLoggerSummary: ${error.message}`, error.stack);
            throw new HttpException(
                { message: "Internal server error", error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Obtiene todos los logs
     */
    @Get()
    async getAllLogs() {
        try {
            return await this.loggerService.getAllLogs();
        } catch (error) {
            this.logger.error(`Error getting all logs: ${error.message}`, error.stack);
            throw new HttpException(
                { message: "Error retrieving logs", error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
    /**
     * Obtiene todos los logs
     */
    @Get('filtered')
    async getAllLogsFiltered(@Req() req: Request) {
        try {
            return await this.loggerService.getAllLogsFiltered(req);
        } catch (error) {
            this.logger.error(`Error getting all logs: ${error.message}`, error.stack);
            throw new HttpException(
                { message: "Error retrieving logs", error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Obtiene un log por su ID
     * @param id ID del log a buscar
     */
    @Get(':id')
    async getLogById(@Param('id') id: string) {
        try {
            return await this.loggerService.getLogById(id);
        } catch (error) {
            this.logger.error(`Error getting log by ID: ${error.message}`, error.stack);
            if (error instanceof NotFoundException) {
                throw new HttpException(
                    { message: error.message },
                    HttpStatus.NOT_FOUND
                );
            }
            throw new HttpException(
                { message: "Error retrieving log", error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Elimina un log (marcado como eliminado)
     * @param id ID del log a eliminar
     */
    @Delete(':id')
    async deleteLog(@Param('id') id: string, @Body('deletedBy') deletedBy: string) {
        try {
            return await this.loggerService.deleteLog(id, deletedBy || 'system');
        } catch (error) {
            this.logger.error(`Error deleting log: ${error.message}`, error.stack);
            if (error instanceof NotFoundException) {
                throw new HttpException(
                    { message: error.message },
                    HttpStatus.NOT_FOUND
                );
            }
            throw new HttpException(
                { message: "Error deleting log", error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}