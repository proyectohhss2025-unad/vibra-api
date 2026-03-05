import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PermissionTemplate, PermissionTemplateDocument } from './schemas/permissionTemplate.schema';
import { PaginatedResponse, PaginationParams, createPaginatedResponse } from '../../utils/pagination';

@Injectable()
export class PermissionTemplatesService {
    constructor(
        @InjectModel(PermissionTemplate.name) private permissionTemplateModel: Model<PermissionTemplateDocument>,
    ) { }

    /**
     * Encuentra todas las plantillas de permisos con paginación
     * @param paginationParams Parámetros de paginación (page, limit)
     * @returns Respuesta paginada con plantillas de permisos
     */
    async findAll(paginationParams?: PaginationParams): Promise<PaginatedResponse<PermissionTemplate> | PermissionTemplate[]> {
        // Si no se proporcionan parámetros de paginación, devolver todos los registros
        if (!paginationParams || (!paginationParams.page && !paginationParams.limit)) {
            return this.permissionTemplateModel.find().exec();
        }

        const { page = 1, limit = 10 } = paginationParams;
        const skip = (page - 1) * limit;
        
        const [data, total] = await Promise.all([
            this.permissionTemplateModel.find().skip(skip).limit(limit).exec(),
            this.permissionTemplateModel.countDocuments().exec()
        ]);
        
        return createPaginatedResponse(data, total, page, limit);
    }

    async findOne(id: string): Promise<PermissionTemplate> {
        return this.permissionTemplateModel.findById(id).exec();
    }

    async create(permissionTemplate: Partial<PermissionTemplate>): Promise<PermissionTemplate> {
        const createdPermissionTemplate = new this.permissionTemplateModel(permissionTemplate);
        return createdPermissionTemplate.save();
    }

    async update(id: string, permissionTemplate: Partial<PermissionTemplate>): Promise<PermissionTemplate> {
        return this.permissionTemplateModel.findByIdAndUpdate(id, permissionTemplate, { new: true }).exec();
    }

    async remove(id: string): Promise<PermissionTemplate> {
        return this.permissionTemplateModel.findByIdAndDelete(id).exec();
    }
}