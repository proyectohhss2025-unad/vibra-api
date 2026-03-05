import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/auditLog.schema';

@Injectable()
export class AuditLogService {
    constructor(
        @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    ) { }

    /**
     * save audit log in database
     *
     * @param user user id
     * @param action action performed   
     * @param entity entity affected
     * @param details details of the action
     * @param ip ip address of the user
     * @returns AuditLog
     */
    async saveAuditLog(
        user: string,
        action: string,
        entity: string,
        details?: string,
        ip?: string,
    ): Promise<AuditLog> {
        const auditLog = new this.auditLogModel({
            user,
            action,
            entity,
            details,
            ip,
            timestamp: new Date(),
        });

        return auditLog.save();
    }

    /**
     * get all records of audit log
     *
     * @returns AuditLog[]
     */
    async getAuditLog(): Promise<AuditLog[]> {
        return this.auditLogModel.find({ isActive: true, deleted: false })
            .sort({ timestamp: -1 })
            .exec();
    }

    /**
     * search audit log by user, action, entity, details, ip, from and to
     *
     * @param user user id
     * @param action action performed
     * @param entity entity affected
     * @param details details of the action
     * @param ip ip address of the user
     * @param from start date
     * @param to end date
     * @returns AuditLog[]
     */
    async searchAuditLog(
        user?: string,
        action?: string,
        entity?: string,
        details?: string,
        ip?: string,
        from?: string,
        to?: string,
    ): Promise<AuditLog[]> {
        const query: any = { isActive: true, deleted: false };

        if (user) query.user = user;
        if (action) query.action = action;
        if (entity) query.entity = entity;
        if (details) query.details = { $regex: details, $options: 'i' };
        if (ip) query.ip = ip;

        if (from || to) {
            query.timestamp = {};
            if (from) query.timestamp.$gte = new Date(from);
            if (to) query.timestamp.$lte = new Date(to);
        }

        return this.auditLogModel.find(query).sort({ timestamp: -1 }).exec();
    }

    /**
     * Obtiene un registro de auditoría por su ID
     */
    async getAuditLogById(id: string): Promise<AuditLog> {
        return this.auditLogModel.findById(id).exec();
    }

    /**
     * Elimina un registro de auditoría (marcado como eliminado)
     */
    async deleteAuditLog(id: string, deletedBy: string): Promise<AuditLog> {
        return this.auditLogModel
            .findByIdAndUpdate(
                id,
                {
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy,
                },
                { new: true },
            )
            .exec();
    }

    /**
     * Actualiza un registro de auditoría
     */
    async updateAuditLog(
        id: string,
        updateData: Partial<AuditLog>,
        editedBy: string,
    ): Promise<AuditLog> {
        return this.auditLogModel
            .findByIdAndUpdate(
                id,
                {
                    ...updateData,
                    editedAt: new Date(),
                    editedBy,
                },
                { new: true },
            )
            .exec();
    }
}