import { Body, Controller, Delete, Get, Param, Post, Put, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { SearchAuditLogDto } from './dto/search-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLog } from './schemas/auditLog.schema';

/**
 * Controlador para gestionar los registros de auditoría
 */
@Controller('api/audit-logs')
@UsePipes(new ValidationPipe({ transform: true }))
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) { }

    /**
     * Obtiene todos los registros de auditoría
     * 
     * @returns Lista de registros de auditoría
     */
    @Get()
    async getAllAuditLogs(): Promise<AuditLog[]> {
        return this.auditLogService.getAuditLog();
    }

    /**
     * Busca registros de auditoría según criterios
     * 
     * @param user ID del usuario
     * @param action Acción realizada
     * @param entity Entidad afectada
     * @param details Detalles de la acción
     * @param ip Dirección IP del usuario
     * @param from Fecha de inicio (formato ISO)
     * @param to Fecha de fin (formato ISO)
     * @returns Lista de registros de auditoría filtrados
     */
    @Get('search')
    async searchAuditLogs(@Query() searchDto: SearchAuditLogDto): Promise<AuditLog[]> {
        return this.auditLogService.searchAuditLog(
            searchDto.user,
            searchDto.action,
            searchDto.entity,
            searchDto.details,
            searchDto.ip,
            searchDto.from,
            searchDto.to,
        );
    }

    /**
     * Obtiene un registro de auditoría por su ID
     * 
     * @param id ID del registro de auditoría
     * @returns Registro de auditoría
     */
    @Get(':id')
    async getAuditLogById(@Param('id') id: string): Promise<AuditLog> {
        return this.auditLogService.getAuditLogById(id);
    }

    /**
     * Crea un nuevo registro de auditoría
     * 
     * @param auditLogData Datos del registro de auditoría
     * @returns Registro de auditoría creado
     */
    @Post()
    async createAuditLog(@Body() createDto: CreateAuditLogDto): Promise<AuditLog> {
        return this.auditLogService.saveAuditLog(
            createDto.user,
            createDto.action,
            createDto.entity,
            createDto.details,
            createDto.ip,
        );
    }

    /**
     * Actualiza un registro de auditoría
     * 
     * @param id ID del registro de auditoría
     * @param updateData Datos a actualizar
     * @param editedBy ID del usuario que realiza la actualización
     * @returns Registro de auditoría actualizado
     */
    @Put(':id')
    async updateAuditLog(
        @Param('id') id: string,
        @Body() updateDto: UpdateAuditLogDto,
    ): Promise<AuditLog> {
        return this.auditLogService.updateAuditLog(id, updateDto, updateDto.editedBy);
    }

    /**
     * Elimina un registro de auditoría (marcado como eliminado)
     * 
     * @param id ID del registro de auditoría
     * @param deletedBy ID del usuario que realiza la eliminación
     * @returns Registro de auditoría eliminado
     */
    /**
     * Elimina un registro de auditoría (marcado como eliminado)
     * 
     * @param id ID del registro de auditoría
     * @param deleteDto Datos para la eliminación
     * @returns Registro de auditoría eliminado
     */
    @Delete(':id')
    async deleteAuditLog(
        @Param('id') id: string,
        @Body('deletedBy') deletedBy: string,
    ): Promise<AuditLog> {
        return this.auditLogService.deleteAuditLog(id, deletedBy);
    }
}