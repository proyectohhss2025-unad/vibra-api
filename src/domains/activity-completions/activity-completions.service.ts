import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { CreateCompletionDto } from './dto/create-completion.dto';
import { ActivityCompletion } from './schemas/activity-completion.schema';
import {
  Participant,
  calculateLevel,
} from '../participant/schemas/participant.schema';
import { getColombiaDayRange } from '../../utils/dates';

@Injectable()
export class ActivityCompletionsService {
  constructor(
    @InjectModel(ActivityCompletion.name)
    private completionModel: Model<ActivityCompletion>,
    @InjectModel(Participant.name)
    private participantModel: Model<Participant>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.log('ActivityCompletionsService initialized');
  }

  /**
   * Crea un registro de completación de actividad
   * y verifica si el participante subió de nivel.
   */
  async create(dto: CreateCompletionDto): Promise<ActivityCompletion> {
    this.logger.log(`Creating completion for participant ${dto.participant}`);
    const completion = new this.completionModel({
      participant: new Types.ObjectId(dto.participant),
      activity: new Types.ObjectId(dto.activity),
      plannedScore: dto.plannedScore,
      achievedScore: dto.achievedScore,
      timeSpent: dto.timeSpent ?? null,
      gamesCompleted: dto.gamesCompleted ?? [],
      completedAt: new Date(),
    });
    const saved = await completion.save();

    // ─── Actualizar puntos, nivel y estadísticas del participante ───
    try {
      const participant = await this.participantModel
        .findById(dto.participant)
        .exec();
      if (participant) {
        const totalPoints =
          (participant.points || 0) + (dto.achievedScore || 0);
        const newLevel = calculateLevel(totalPoints);

        const updateFields: Record<string, any> = {
          points: totalPoints,
          totalActivitiesCompleted:
            (participant.totalActivitiesCompleted || 0) + 1,
          lastActivityDate: new Date(),
        };

        if (newLevel !== participant.level) {
          updateFields.level = newLevel;
        }

        await this.participantModel
          .findByIdAndUpdate(dto.participant, updateFields)
          .exec();

        if (newLevel !== participant.level) {
          this.logger.log(
            `🎉 Participant ${dto.participant} leveled up: ${participant.level} → ${newLevel}`,
          );
        } else {
          this.logger.log(
            `📊 Participant ${dto.participant} points updated: ${participant.points} → ${totalPoints}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Error updating points for ${dto.participant}: ${err.message}`,
      );
    }

    return saved;
  }

  /**
   * Obtiene una completación por ID
   */
  async findById(id: string): Promise<ActivityCompletion> {
    const completion = await this.completionModel
      .findById(id)
      .populate('activity')
      .populate('participant')
      .exec();
    if (!completion) {
      throw new NotFoundException(`Completion with id ${id} not found`);
    }
    return completion;
  }

  /**
   * Obtiene el historial de completaciones de un participante
   */
  async findByParticipant(
    participantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: ActivityCompletion[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.completionModel
        .find({ participant: new Types.ObjectId(participantId) })
        .populate('activity', 'title emotion difficulty')
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.completionModel
        .countDocuments({ participant: new Types.ObjectId(participantId) })
        .exec(),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Obtiene estadísticas de un participante: total, promedio, ranking.
   */
  async getStats(participantId: string): Promise<{
    totalParticipations: number;
    totalAchievedScore: number;
    totalPlannedScore: number;
    averagePercent: number;
    bestScore: number;
    lastActivityDate: Date | null;
    rankingPosition: number;
    activities: any[];
  }> {
    const participantObjectId = new Types.ObjectId(participantId);

    // Obtener todas las completaciones del participante
    const completions = await this.completionModel
      .find({ participant: participantObjectId })
      .populate('activity', 'title')
      .sort({ completedAt: -1 })
      .exec();

    const totalParticipations = completions.length;
    const totalAchievedScore = completions.reduce(
      (s, c) => s + c.achievedScore,
      0,
    );
    const totalPlannedScore = completions.reduce(
      (s, c) => s + c.plannedScore,
      0,
    );
    const averagePercent =
      totalPlannedScore > 0
        ? Math.round((totalAchievedScore / totalPlannedScore) * 100)
        : 0;
    const bestScore =
      completions.length > 0
        ? Math.max(...completions.map((c) => c.achievedScore))
        : 0;
    const lastActivityDate =
      completions.length > 0 ? completions[0].completedAt : null;

    // Calcular posición en el ranking global (por suma de puntos)
    const rankingPosition = await this.getRankingPosition(participantId);

    const activities = completions.map((c) => ({
      completionId: c._id.toString(),
      activityId: (c.activity as any)?._id?.toString(),
      activityTitle: (c.activity as any)?.title || 'Sin título',
      achievedScore: c.achievedScore,
      plannedScore: c.plannedScore,
      percent:
        c.plannedScore > 0
          ? Math.round((c.achievedScore / c.plannedScore) * 100)
          : 0,
      timeSpent: c.timeSpent,
      gamesCompleted: c.gamesCompleted,
      completedAt: c.completedAt,
    }));

    return {
      totalParticipations,
      totalAchievedScore,
      totalPlannedScore,
      averagePercent,
      bestScore,
      lastActivityDate,
      rankingPosition,
      activities,
    };
  }

  /**
   * Obtiene el ranking global de participantes por puntaje acumulado.
   */
  async getRanking(limit: number = 20): Promise<
    {
      position: number;
      participantId: string;
      totalScore: number;
      totalParticipations: number;
    }[]
  > {
    const ranking = await this.completionModel.aggregate([
      {
        $group: {
          _id: '$participant',
          totalScore: { $sum: '$achievedScore' },
          totalParticipations: { $sum: 1 },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          participantId: '$_id',
          totalScore: 1,
          totalParticipations: 1,
        },
      },
    ]);

    return ranking.map((r, i) => ({
      position: i + 1,
      participantId: r.participantId.toString(),
      totalScore: r.totalScore,
      totalParticipations: r.totalParticipations,
    }));
  }

  /**
   * Calcula la posición de un participante en el ranking global.
   */
  private async getRankingPosition(participantId: string): Promise<number> {
    const participantObjectId = new Types.ObjectId(participantId);

    // Obtener el puntaje total del participante
    const participantResult = await this.completionModel.aggregate([
      { $match: { participant: participantObjectId } },
      { $group: { _id: null, totalScore: { $sum: '$achievedScore' } } },
    ]);

    if (participantResult.length === 0) return 0;

    const totalScore = participantResult[0].totalScore;

    // Contar cuántos participantes tienen más puntos
    const higherRanked = await this.completionModel.aggregate([
      {
        $group: {
          _id: '$participant',
          totalScore: { $sum: '$achievedScore' },
        },
      },
      { $match: { totalScore: { $gt: totalScore } } },
      { $count: 'count' },
    ]);

    return (higherRanked[0]?.count ?? 0) + 1;
  }

  /**
   * Obtiene el número de completaciones registradas hoy.
   */
  async getTodayCount(): Promise<number> {
    const { start, end } = getColombiaDayRange();

    return this.completionModel
      .countDocuments({
        completedAt: { $gte: start, $lte: end },
      })
      .exec();
  }
}
