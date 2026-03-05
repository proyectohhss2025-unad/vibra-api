import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateLoggerDto } from './dto/create-logger.dto';
import { FilterLoggerDto } from './dto/filter-logger.dto';
import { Logger, LoggerDocument } from './schemas/logger.schema';

@Injectable()
export class LoggerService {
    constructor(
        @InjectModel(Logger.name) private loggerModel: Model<LoggerDocument>,
    ) { }

    /**
     * Guarda un nuevo log en la base de datos
     * @param logDetails Detalles del log a guardar
     * @returns El log guardado
     */
    async saveLog(logDetails: CreateLoggerDto): Promise<Logger> {
        const log = new this.loggerModel(logDetails);
        return log.save();
    }

    /**
     * Obtiene logs filtrados y paginados
     * @param filterDto DTO con los filtros y opciones de paginación
     * @returns Logs filtrados y paginados, junto con metadatos
     */
    async getFilteredLogs(filterDto: FilterLoggerDto): Promise<{
        paginatedLogs: Logger[],
        totalPaginatedLogs: number,
        totalLogs: number
    }> {
        const { method, url, status, startTime, endTime, page, limit } = filterDto;
        const query: any = { isActive: true, deleted: false };

        if (method) query.method = method;
        if (url) query.url = { $regex: url, $options: 'i' };
        if (status) query.status = status;

        if (startTime || endTime) {
            query.timestamp = {};
            if (startTime) query.timestamp.$gte = new Date(startTime);
            if (endTime) query.timestamp.$lte = new Date(endTime);
        }

        const totalLogs = await this.loggerModel.countDocuments(query).exec();

        const paginatedLogs = await this.loggerModel.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        const totalPaginatedLogs = paginatedLogs.length;

        return { paginatedLogs, totalPaginatedLogs, totalLogs };
    }

    /**
     * Obtiene un log por su ID
     * @param id ID del log a buscar
     * @returns El log encontrado
     */
    async getLogById(id: string): Promise<Logger> {
        const log = await this.loggerModel.findById(id).exec();
        if (!log) {
            throw new NotFoundException(`Log with ID ${id} not found`);
        }
        return log;
    }

    /**
     * Elimina un log (marcado como eliminado)
     * @param id ID del log a eliminar
     * @param deletedBy Usuario que realiza la eliminación
     * @returns El log eliminado
     */
    async deleteLog(id: string, deletedBy: string): Promise<Logger> {
        const log = await this.loggerModel.findByIdAndUpdate(
            id,
            {
                deleted: true,
                deletedAt: new Date(),
                deletedBy,
            },
            { new: true },
        ).exec();

        if (!log) {
            throw new NotFoundException(`Log with ID ${id} not found`);
        }

        return log;
    }

    /**
     * Obtiene todos los logs
     * @returns Lista de todos los logs activos
     */
    async getAllLogs(): Promise<Logger[]> {
        return this.loggerModel.find({ isActive: true, deleted: false })
            .sort({ timestamp: -1 })
            .exec();
    }

    /**
     * Obtiene todos los logs
     * @returns Lista de todos los logs activos
     */
    async getAllLogsFiltered(req: any): Promise<any> {
        const { method, url, status, startTime, endTime, page = 1, limit = 100 } = req.query;

        // Validar los parámetros de paginación
        const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
        const limitNum = Math.max(parseInt(limit as string, 10) || 10, 1);

        // Obtener los logs filtrados y paginados desde el servicio
        const { paginatedLogs, totalPaginatedLogs, totalLogs } = await this.getFilteredLogs({
            method: method as string,
            url: url as string,
            status: status ? parseInt(status as string, 10) : undefined,
            startTime: startTime as string,
            endTime: endTime as string,
            page: pageNum,
            limit: limitNum,
        });

        // Calcular el total de páginas
        const totalPages = Math.ceil(totalLogs / limitNum);

        // Responder con los datos
        return {
            paginatedLogs,
            meta: {
                totalLogs,
                totalPaginatedLogs,
                currentPage: pageNum,
                totalPages,
            },
        };

    }
}