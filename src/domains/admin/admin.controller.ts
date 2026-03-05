import { Controller, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /**
     * Generate database backups
     * 
     * @param req - Request object containing user information
     * @returns Success message
     */
    @Post('backups/generate')
    async generateBackups(@Body() req: any) {
        try {
            const message = await this.adminService.generateBackups(req.user_);
            return { message };
        } catch (error) {
            throw new HttpException(
                { error: 'Error generando la copia de seguridad' },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Check invoices and generate notifications
     * 
     * @returns Success message
     */
    @Post('invoices/check')
    async checkInvoices() {
        try {
            const message = await this.adminService.checkInvoices();
            return { message };
        } catch (error) {
            throw new HttpException(
                { error: 'Error en la generación de notificaciones' },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Delete all documents for testing purposes
     * 
     * @returns Success message
     */
    @Post('test/delete-all')
    async deleteAllDocumentsByTest() {
        try {
            const message = await this.adminService.deleteAllDocumentsByTest();
            return { message };
        } catch (error) {
            throw new HttpException(
                { message: 'Error eliminando Los datos en las colecciones.' },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}