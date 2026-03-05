import { Controller, Get, Post, Body, Param, Put, Delete, UseInterceptors, UploadedFile, BadRequestException, NotFoundException, InternalServerErrorException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import * as log4js from 'log4js';
import { PermissionTemplatesService } from './permissionTemplates.service';
import { PermissionTemplate } from './schemas/permissionTemplate.schema';
import { Permission } from '../permissions/schemas/permission.schema';
import { UserPermission } from '../userPermissions/schemas/userPermission.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { findItem, generateSerial } from '../../utils/string';

const logger = log4js.getLogger('default');

@Controller('api/permission-templates')
export class PermissionTemplatesController {
    constructor(
        private readonly permissionTemplatesService: PermissionTemplatesService,
        @InjectModel(Permission.name) private permissionModel: Model<Permission>,
        @InjectModel(UserPermission.name) private userPermissionModel: Model<UserPermission>,
    ) { }

    /**
     * Obtiene todas las plantillas de permisos con soporte para paginación
     * @param page Número de página (opcional, por defecto: 1)
     * @param limit Límite de registros por página (opcional, por defecto: 10)
     * @returns Plantillas de permisos paginadas o todas si no se especifican parámetros de paginación
     */
    @Get()
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        // Convertir los parámetros de string a number si están presentes
        const pageNumber = page ? parseInt(page.toString(), 10) : undefined;
        const limitNumber = limit ? parseInt(limit.toString(), 10) : undefined;

        // Solo pasar los parámetros de paginación si al menos uno está definido
        if (pageNumber !== undefined || limitNumber !== undefined) {
            return this.permissionTemplatesService.findAll({
                page: pageNumber,
                limit: limitNumber,
            });
        }

        return this.permissionTemplatesService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const template = await this.permissionTemplatesService.findOne(id);
        if (!template) {
            throw new NotFoundException('Permission template not found');
        }
        return template;
    }

    /**
     * Create a new permission template
     */
    @Post()
    async create(@Body() permissionTemplate: Partial<PermissionTemplate>) {
        try {
            return await this.permissionTemplatesService.create(permissionTemplate);
        } catch (error) {
            logger.error('Error creating permission template:', { error });
            throw new InternalServerErrorException('Failed to create permission template');
        }
    }

    /**
     * Upload and process multiple permission templates from a CSV file
     */
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async addManyPermissionTemplates(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            logger.warn('No file uploaded');
            throw new BadRequestException('No file uploaded');
        }

        const filePath = file.path;

        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const permissionTemplatesData = await new Promise<any[]>((resolve, reject) => {
                parse(fileContent, { columns: true }, (err, data) => {
                    if (err) reject(err);
                    resolve(data);
                });
            });

            const permissionTemplates: Partial<PermissionTemplate>[] = [];

            for (const row of permissionTemplatesData) {
                const permissionTemplate: Partial<PermissionTemplate> = {
                    serial: row['serial'] || generateSerial(),
                    name: row['name'],
                    description: row['description'],
                    isActive: true,
                    createdAt: new Date(),
                    createdBy: row['createdBy'],
                };
                permissionTemplates.push(permissionTemplate);
            }

            // Insert all templates
            await Promise.all(
                permissionTemplates.map(template =>
                    this.permissionTemplatesService.create(template)
                )
            );

            return { message: 'Permission templates inserted successfully' };
        } catch (error) {
            logger.error('Error inserting permission templates:', { error });
            throw new InternalServerErrorException('Failed to insert permission templates');
        } finally {
            // Clean up the temporary file
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                logger.error('Error deleting temporary file:', { error });
            }
        }
    }

    /**
     * Add a permission to a template
     */
    @Post(':id/permissions')
    async addPermissionToTemplate(
        @Param('id') id: string,
        @Body() body: { permissionId: string; editedBy: string }
    ) {
        try {
            const { permissionId, editedBy } = body;

            const existingPermissionTemplate = await this.permissionTemplatesService.findOne(id);
            if (!existingPermissionTemplate) {
                throw new NotFoundException('Permission template not found');
            }

            const permission = await this.permissionModel.findById(permissionId).exec();
            if (!permission) {
                throw new NotFoundException('Permission not found');
            }

            // Check if permission already exists in template
            const permissions = existingPermissionTemplate.permissions as any[];
            const foundItem = permissions.some(p =>
                p.toString() === permissionId ||
                (p._id && p._id.toString() === permissionId)
            );

            if (foundItem) {
                return { message: 'Permission already exists in the template' };
            }

            // Add permission to template
            existingPermissionTemplate.permissions = [
                ...permissions,
                permissionId
            ];

            existingPermissionTemplate.editedAt = new Date();
            existingPermissionTemplate.editedBy = editedBy;

            const updatedTemplate = await this.permissionTemplatesService.update(
                id,
                existingPermissionTemplate
            );

            logger.info('Permission template updated successfully with data:', {
                templateId: id,
                permissionId,
                editedBy
            });

            return {
                permissionTemplate: updatedTemplate
            };
        } catch (error) {
            logger.error('Error adding permission to template', { error });
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Error adding permission to template');
        }
    }

    /**
     * Soft delete a permission for a user
     */
    @Put('permissions/soft-delete')
    async softDeletePermissionToUser(
        @Body() body: { permissionId: string; userId: string; deleted: boolean; deletedBy: string }
    ) {
        try {
            const { permissionId, userId, deleted, deletedBy } = body;

            const permissionUser = await this.userPermissionModel.findOne({
                permission: permissionId,
                user: userId
            }).exec();

            if (!permissionUser) {
                logger.warn('Permission not found for user');
                throw new NotFoundException('The update was not completed, permission not found');
            }

            permissionUser.deleted = deleted;
            permissionUser.deletedBy = deletedBy;
            permissionUser.deletedAt = new Date();

            await permissionUser.save();

            logger.info('The soft delete has been completed successfully', { permissionUser });
            return { permission: permissionUser };
        } catch (error) {
            logger.error('Error deleting permission', { error });
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Error deleting permission');
        }
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() permissionTemplate: Partial<PermissionTemplate>) {
        const updated = await this.permissionTemplatesService.update(id, permissionTemplate);
        if (!updated) {
            throw new NotFoundException('Permission template not found');
        }
        return updated;
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const deleted = await this.permissionTemplatesService.remove(id);
        if (!deleted) {
            throw new NotFoundException('Permission template not found');
        }
        return deleted;
    }
}