import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
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
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { SearchAuditLogDto } from './dto/search-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLog } from './schemas/auditLog.schema';

class AuditLogDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ example: '69c4b4fc528c5e1f4ab79d0c' })
  user: string;

  @ApiProperty({ example: 'CREATE' })
  action: string;

  @ApiProperty({ example: 'User' })
  entity: string;

  @ApiPropertyOptional({ example: 'Se creó el usuario maya.' })
  details?: string;

  @ApiPropertyOptional({ example: '127.0.0.1' })
  ip?: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  timestamp?: string;

  @ApiPropertyOptional({ example: 'AUD-0001' })
  serial?: string;
}

/**
 * Controlador para gestionar los registros de auditoría
 */
@ApiTags('Audit Logs')
@Controller('api/audit-logs')
@UsePipes(new ValidationPipe({ transform: true }))
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Obtiene todos los registros de auditoría
   *
   * @returns Lista de registros de auditoría
   */
  @Get()
  @ApiOperation({ summary: 'Listar registros de auditoría' })
  @ApiOkResponse({ description: 'Listado de registros de auditoría.', type: [AuditLogDto] })
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
  @ApiOperation({ summary: 'Buscar registros de auditoría' })
  @ApiQuery({ name: 'user', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'details', required: false })
  @ApiQuery({ name: 'ip', required: false })
  @ApiQuery({ name: 'from', required: false, example: '2026-01-01T00:00:00.000Z' })
  @ApiQuery({ name: 'to', required: false, example: '2026-01-31T23:59:59.999Z' })
  @ApiOkResponse({ description: 'Resultados de búsqueda.', type: [AuditLogDto] })
  async searchAuditLogs(
    @Query() searchDto: SearchAuditLogDto,
  ): Promise<AuditLog[]> {
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
  @ApiOperation({ summary: 'Obtener registro de auditoría por id' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiOkResponse({ description: 'Registro encontrado.', type: AuditLogDto })
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
  @ApiOperation({ summary: 'Crear registro de auditoría' })
  @ApiBody({ type: CreateAuditLogDto })
  @ApiCreatedResponse({ description: 'Registro creado.', type: AuditLogDto })
  async createAuditLog(
    @Body() createDto: CreateAuditLogDto,
  ): Promise<AuditLog> {
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
  @ApiOperation({ summary: 'Actualizar registro de auditoría' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiBody({ type: UpdateAuditLogDto })
  @ApiOkResponse({ description: 'Registro actualizado.', type: AuditLogDto })
  async updateAuditLog(
    @Param('id') id: string,
    @Body() updateDto: UpdateAuditLogDto,
  ): Promise<AuditLog> {
    return this.auditLogService.updateAuditLog(
      id,
      updateDto,
      updateDto.editedBy,
    );
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
  @ApiOperation({ summary: 'Eliminar registro de auditoría' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { deletedBy: { type: 'string', example: 'admin' } },
      required: ['deletedBy'],
    },
  })
  @ApiOkResponse({ description: 'Registro eliminado.', type: AuditLogDto })
  async deleteAuditLog(
    @Param('id') id: string,
    @Body('deletedBy') deletedBy: string,
  ): Promise<AuditLog> {
    return this.auditLogService.deleteAuditLog(id, deletedBy);
  }
}
