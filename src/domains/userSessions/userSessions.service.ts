import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserSession, UserSessionDocument } from './schemas/userSession.schema';

@Injectable()
export class UserSessionsService {
    constructor(
        @InjectModel(UserSession.name) private userSessionModel: Model<UserSessionDocument>,
    ) { }

    /**
     * Encuentra todas las sesiones de usuario
     * @returns Promise con array de sesiones de usuario
     */
    async findAll(): Promise<UserSession[]> {
        return this.userSessionModel.find().exec();
    }

    /**
     * Encuentra una sesión de usuario por ID
     * @param id ID de la sesión
     * @returns Promise con la sesión de usuario
     */
    async findOne(id: string): Promise<UserSession> {
        return this.userSessionModel.findById(id).exec();
    }

    /**
     * Encuentra sesiones de usuario por usuario
     * @param userId ID del usuario
     * @returns Promise con array de sesiones del usuario
     */
    async findByUser(userId: string): Promise<UserSession[]> {
        return this.userSessionModel.find({ user: new Types.ObjectId(userId) }).exec();
    }

    /**
     * Encuentra sesiones de usuario por compañía
     * @param companyId ID de la compañía
     * @returns Promise con array de sesiones de la compañía
     */
    async findByCompany(companyId: string): Promise<UserSession[]> {
        return this.userSessionModel.find({ company: new Types.ObjectId(companyId) }).exec();
    }

    /**
     * Crea una nueva sesión de usuario
     * @param userSession Datos de la sesión a crear
     * @returns Promise con la sesión creada
     */
    async create(userSession: Partial<UserSession>): Promise<UserSession> {
        const newUserSession = new this.userSessionModel(userSession);
        return newUserSession.save();
    }

    /**
     * Actualiza una sesión de usuario
     * @param id ID de la sesión a actualizar
     * @param userSession Datos actualizados de la sesión
     * @returns Promise con la sesión actualizada
     */
    async update(id: string, userSession: Partial<UserSession>): Promise<UserSession> {
        return this.userSessionModel.findByIdAndUpdate(id, userSession, { new: true }).exec();
    }

    /**
     * Elimina una sesión de usuario
     * @param id ID de la sesión a eliminar
     * @returns Promise con la sesión eliminada
     */
    async remove(id: string): Promise<UserSession> {
        return this.userSessionModel.findByIdAndDelete(id).exec();
    }

    /**
     * Cierra una sesión de usuario
     * @param id ID de la sesión a cerrar
     * @returns Promise con la sesión cerrada
     */
    async closeSession(id: string): Promise<UserSession> {
        return this.userSessionModel.findByIdAndUpdate(
            id,
            {
                isLogged: false,
                endTime: new Date()
            },
            { new: true }
        ).exec();
    }
}