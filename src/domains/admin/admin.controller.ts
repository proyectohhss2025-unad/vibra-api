import {
  Controller,
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
