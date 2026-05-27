import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get status of the ideas.json file for the admin panel
   *
   * @returns Ideas file status
   */
  @Get('ideas-status')
  @ApiOperation({ summary: 'Obtener estado del archivo de ideas del backlog' })
  @ApiResponse({
    status: 200,
    description: 'Estado del archivo ideas.json',
    schema: {
      type: 'object',
      properties: {
        ideasPath: { type: 'string' },
        fileExists: { type: 'boolean' },
        totalIdeas: { type: 'integer' },
        lastModified: { type: 'string' },
      },
    },
  })
  async getIdeasStatus() {
    try {
      return await this.adminService.getIdeasStatus();
    } catch (error) {
      throw new HttpException(
        { error: 'Error al leer el estado de ideas.json' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all unique tags from ideas.json for autocomplete
   *
   * @returns List of unique tags
   */
  @Get('ideas-tags')
  @ApiOperation({ summary: 'Obtener tags únicos del backlog de ideas (autocomplete)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tags únicos',
    schema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getAvailableTags() {
    try {
      return await this.adminService.getAvailableTags();
    } catch (error) {
      throw new HttpException(
        { error: 'Error al obtener tags de ideas.json' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate database backups
   *
   * @param req - Request object containing user information
   * @returns Success message
   */
  @ApiOperation({ summary: 'Generar copias de seguridad de la base de datos' })
  @ApiBody({ 
    description: 'Objeto de solicitud que contiene información del usuario',
    schema: {
      type: 'object',
      properties: {
        user_: { type: 'string', description: 'ID del usuario' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Copia de seguridad generada exitosamente' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  @Post('backups/generate')
  async generateBackups(@Body() req: any) {
    try {
      const message = await this.adminService.generateBackups(req.user_);
      return { message };
    } catch (error) {
      throw new HttpException(
        { error: 'Error generando la copia de seguridad' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check invoices and generate notifications
   *
   * @returns Success message
   */
  @ApiOperation({ summary: 'Verificar facturas y generar notificaciones' })
  @ApiResponse({ status: 200, description: 'Facturas verificadas y notificaciones generadas exitosamente' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  @Post('invoices/check')
  async checkInvoices() {
    try {
      const message = await this.adminService.checkInvoices();
      return { message };
    } catch (error) {
      throw new HttpException(
        { error: 'Error en la generación de notificaciones' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete all documents for testing purposes
   *
   * @returns Success message
   */
  @ApiOperation({ summary: 'Eliminar todos los documentos para propósitos de prueba' })
  @ApiResponse({ status: 200, description: 'Documentos eliminados exitosamente' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  @Post('test/delete-all')
  async deleteAllDocumentsByTest() {
    try {
      const message = await this.adminService.deleteAllDocumentsByTest();
      return { message };
    } catch (error) {
      throw new HttpException(
        { message: 'Error eliminando Los datos en las colecciones.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
