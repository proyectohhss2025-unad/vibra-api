import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserResponse } from './schemas/userResponse.schema';

@Injectable()
export class UserResponseService {
  constructor(
    @InjectModel(UserResponse.name)
    private responseModel: Model<UserResponse>,
  ) {}

  /**
   * Creates a new user response.
   * @param responseData - The data for the new user response.
   * @returns The created user response.
   */
  async createResponse(
    responseData: Partial<UserResponse>,
  ): Promise<UserResponse> {
    const response = new this.responseModel(responseData);
    return response.save();
  }

  /**
   * Retrieves all user responses for a given user.
   * @param userId - The ID of the user.
   * @returns An array of user responses.
   */
  async getUserResponses(userId: string): Promise<UserResponse[]> {
    return this.responseModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obtiene respuestas de una actividad con filtros opcionales y paginación.
   *
   * @param activityId - ID de la actividad (ObjectId string)
   * @param page - Número de página
   * @param limit - Elementos por página
   * @param userId - (opcional) Filtrar por usuario
   * @param dateFrom - (opcional) Fecha inicio (ISO string)
   * @param dateTo - (opcional) Fecha fin (ISO string)
   * @returns { data: any[], total: number }
   */
  async findByActivity(
    activityId: string,
    page: number = 1,
    limit: number = 10,
    userId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ data: any[]; total: number }> {
    const filter: any = { activity: new Types.ObjectId(activityId) };

    if (userId) {
      filter.user = new Types.ObjectId(userId);
    }

    if (dateFrom || dateTo) {
      filter.endTime = {};
      if (dateFrom) filter.endTime.$gte = new Date(dateFrom);
      if (dateTo) filter.endTime.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.responseModel
        .find(filter)
        .populate({
          path: 'user',
          select: 'name username email documentNumber',
        })
        .sort({ endTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.responseModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  /**
   * Obtener lista de usuarios que han respondido una actividad (para filtro).
   */
  async findUsersByActivity(activityId: string): Promise<any[]> {
    return this.responseModel
      .find({ activity: new Types.ObjectId(activityId) })
      .populate({ path: 'user', select: 'name username' })
      .sort({ endTime: -1 })
      .lean()
      .exec();
  }

  /**
   * Verifica si un usuario ya ha respondido una actividad específica.
   * @returns El score si ya respondió, o null si no.
   */
  async checkUserResponse(
    userId: string,
    activityId: string,
  ): Promise<{
    alreadyResponded: boolean;
    score?: number;
    respondedAt?: Date;
  } | null> {
    if (!userId || !activityId) return null;
    try {
      const response = await this.responseModel
        .findOne({
          user: new Types.ObjectId(userId),
          activity: new Types.ObjectId(activityId),
        })
        .select('score endTime')
        .lean()
        .exec();

      if (!response) return { alreadyResponded: false };

      return {
        alreadyResponded: true,
        score: response.score,
        respondedAt: response.endTime,
      };
    } catch {
      return { alreadyResponded: false };
    }
  }
}
