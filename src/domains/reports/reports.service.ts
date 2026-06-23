import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity } from 'src/domains/activities/schemas/activity.schema';
import { UserResponse } from 'src/domains/userResponses/schemas/userResponse.schema';
import { Emotion } from 'src/domains/emotions/schemas/emotion.schema';
import { Participant } from 'src/domains/participant/schemas/participant.schema';
import { User } from 'src/domains/users/schemas/user.schema';
import { ReportFilterDto } from './dto/report-filter.dto';
import type {
  KpiReport,
  ActivityReportItem,
  UserReportItem,
  EmotionReportItem,
  TrendPoint,
  ScoreDistribution,
  PaginatedResult,
  UserProfile,
} from './interfaces/report.interface';

const COLOMBIA_TZ = 'America/Bogota';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
    @InjectModel(UserResponse.name)
    private userResponseModel: Model<UserResponse>,
    @InjectModel(Emotion.name) private emotionModel: Model<Emotion>,
    @InjectModel(Participant.name) private participantModel: Model<Participant>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  // ─── helpers ────────────────────────────────────

  /**
   * Construye filtro $match para userresponses según fechas y emoción.
   * Para filtrar por emoción (que está en activities, no en userresponses),
   * primero busca los activity IDs que tengan esa emoción.
   */
  private async buildUserResponseMatch(
    filter: ReportFilterDto,
  ): Promise<Record<string, any>> {
    const match: Record<string, any> = {};

    // Filtro por fechas
    if (filter.dateFrom || filter.dateTo) {
      match.startTime = {};
      if (filter.dateFrom)
        match.startTime.$gte = new Date(`${filter.dateFrom}T00:00:00-05:00`);
      if (filter.dateTo)
        match.startTime.$lte = new Date(`${filter.dateTo}T23:59:59.999-05:00`);
    }

    // Filtro por emoción: buscar activity IDs que tengan esa emoción
    if (filter.emotionId) {
      const emotionObjectId = new Types.ObjectId(filter.emotionId);
      const activitiesWithEmotion = await this.activityModel
        .find({ emotion: emotionObjectId })
        .select('_id')
        .lean();
      const activityIds = activitiesWithEmotion.map((a) => a._id);
      if (activityIds.length > 0) {
        match.activity = { $in: activityIds };
      } else {
        // No hay actividades con esa emoción → forzar que no haya resultados
        match.activity = { $in: [] };
      }
    }

    return match;
  }

  // ─── KPI ────────────────────────────────────────

  async getKpi(filter: ReportFilterDto): Promise<KpiReport> {
    const dateMatch = await this.buildUserResponseMatch(filter);

    const [kpiResult] = await this.userResponseModel.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          avgScore: { $avg: '$score' },
          totalScore: { $sum: '$score' },
          avgTime: { $avg: { $subtract: ['$endTime', '$startTime'] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalResponses: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          avgScore: { $round: ['$avgScore', 1] },
          avgTimeMinutes: { $round: [{ $divide: ['$avgTime', 60000] }, 1] },
          totalScore: 1,
        },
      },
    ]);

    // Actividades activas
    const activeActivities = await this.activityModel.countDocuments({
      isActive: true,
    });

    // Respuestas de hoy en Colombia
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: COLOMBIA_TZ });
    const todayStart = new Date(`${todayStr}T00:00:00-05:00`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999-05:00`);
    const todayResponses = await this.userResponseModel.countDocuments({
      startTime: { $gte: todayStart, $lte: todayEnd },
    });

    return {
      totalResponses: kpiResult?.totalResponses ?? 0,
      uniqueUsers: kpiResult?.uniqueUsers ?? 0,
      avgScore: kpiResult?.avgScore ?? 0,
      avgTimeMinutes: kpiResult?.avgTimeMinutes ?? 0,
      totalScore: kpiResult?.totalScore ?? 0,
      todayResponses,
      activeActivities,
    };
  }

  // ─── By Activity ────────────────────────────────

  async getByActivity(
    filter: ReportFilterDto,
  ): Promise<PaginatedResult<ActivityReportItem>> {
    const dateMatch = await this.buildUserResponseMatch(filter);
    const page = Number(filter.page) || 1;
    const pageSize = Number(filter.pageSize) || 12;
    const skip = (page - 1) * pageSize;

    const pipeline: any[] = [
      { $match: dateMatch },
      {
        $lookup: {
          from: 'activities',
          localField: 'activity',
          foreignField: '_id',
          as: 'activityInfo',
        },
      },
      { $unwind: '$activityInfo' },
    ];

    // Búsqueda por título de actividad
    if (filter.search) {
      pipeline.push({
        $match: {
          'activityInfo.title': { $regex: filter.search, $options: 'i' },
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: '$activity',
          activityTitle: { $first: '$activityInfo.title' },
          emotionId: { $first: '$activityInfo.emotion' },
          difficulty: { $first: '$activityInfo.difficulty' },
          scheduleDate: { $first: '$activityInfo.schedule.date' },
          totalResponses: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          avgScore: { $avg: '$score' },
          totalScore: { $sum: '$score' },
          avgTime: { $avg: { $subtract: ['$endTime', '$startTime'] } },
        },
      },
      {
        $addFields: {
          uniqueUsersCount: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { totalResponses: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                activityId: '$_id',
                activityTitle: 1,
                emotionId: 1,
                difficulty: 1,
                scheduleDate: 1,
                totalResponses: 1,
                uniqueUsersCount: 1,
                avgScore: { $round: ['$avgScore', 1] },
                avgTimeSeconds: { $round: ['$avgTime', 0] },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    );

    const [result] = await this.userResponseModel.aggregate(pipeline);
    const items: ActivityReportItem[] = result?.data ?? [];
    const total = result?.total?.[0]?.count ?? 0;

    // Enriquecer con nombres de emociones
    const emotionIds = [
      ...new Set(items.map((r) => r.emotionId?.toString())),
    ].filter(Boolean);
    const emotions = await this.emotionModel
      .find({ _id: { $in: emotionIds } })
      .lean();
    const emotionMap = new Map(
      emotions.map((e) => [e._id.toString(), { name: e.name, icon: e.icono }]),
    );

    return {
      data: items.map((r) => ({
        ...r,
        emotionName: emotionMap.get(r.emotionId?.toString())?.name ?? '',
        emotionIcon: emotionMap.get(r.emotionId?.toString())?.icon ?? '',
      })),
      total,
      page,
      pageSize,
    };
  }

  // ─── By User ────────────────────────────────────

  async getByUser(
    filter: ReportFilterDto,
  ): Promise<PaginatedResult<UserReportItem>> {
    const dateMatch = await this.buildUserResponseMatch(filter);
    const page = Number(filter.page) || 1;
    const pageSize = Number(filter.pageSize) || 12;
    const skip = (page - 1) * pageSize;

    const pipeline: any[] = [
      { $match: dateMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $lookup: {
          from: 'participants',
          localField: 'userInfo._id',
          foreignField: 'userId',
          as: 'participantInfo',
        },
      },
      {
        $unwind: { path: '$participantInfo', preserveNullAndEmptyArrays: true },
      },
    ];

    // Búsqueda por nombre de usuario
    if (filter.search) {
      pipeline.push({
        $match: { 'userInfo.name': { $regex: filter.search, $options: 'i' } },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: '$user',
          userName: { $first: '$userInfo.name' },
          email: { $first: '$userInfo.email' },
          totalResponses: { $sum: 1 },
          totalScore: { $sum: '$score' },
          avgScore: { $avg: '$score' },
          totalTime: { $sum: { $subtract: ['$endTime', '$startTime'] } },
          level: { $first: '$participantInfo.level' },
          currentStreak: { $first: '$participantInfo.currentStreak' },
          lastActivityDate: { $first: '$participantInfo.lastActivityDate' },
        },
      },
      { $sort: { totalResponses: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                userId: '$_id',
                userName: 1,
                email: 1,
                totalResponses: 1,
                totalScore: 1,
                avgScore: { $round: ['$avgScore', 1] },
                totalTimeSeconds: { $round: ['$totalTime', 0] },
                level: { $ifNull: ['$level', ''] },
                currentStreak: { $ifNull: ['$currentStreak', 0] },
                lastActivityDate: { $ifNull: ['$lastActivityDate', ''] },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    );

    const [result] = await this.userResponseModel.aggregate(pipeline);

    return {
      data: result?.data ?? [],
      total: result?.total?.[0]?.count ?? 0,
      page,
      pageSize,
    };
  }

  // ─── By Emotion ─────────────────────────────────

  async getByEmotion(filter: ReportFilterDto): Promise<EmotionReportItem[]> {
    const dateMatch = await this.buildUserResponseMatch(filter);

    const pipeline: any[] = [
      { $match: dateMatch },
      {
        $lookup: {
          from: 'activities',
          localField: 'activity',
          foreignField: '_id',
          as: 'activityInfo',
        },
      },
      { $unwind: '$activityInfo' },
      {
        $lookup: {
          from: 'emotions',
          localField: 'activityInfo.emotion',
          foreignField: '_id',
          as: 'emotionInfo',
        },
      },
      { $unwind: { path: '$emotionInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$activityInfo.emotion',
          emotionName: { $first: '$emotionInfo.name' },
          emotionCategory: { $first: '$emotionInfo.category' },
          emotionIcon: { $first: '$emotionInfo.icono' },
          totalResponses: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          distinctActivities: { $addToSet: '$activity' },
          avgScore: { $avg: '$score' },
        },
      },
      {
        $addFields: {
          uniqueUsersCount: { $size: '$uniqueUsers' },
          distinctActivitiesCount: { $size: '$distinctActivities' },
        },
      },
      { $sort: { totalResponses: -1 } },
      {
        $project: {
          _id: 0,
          emotionId: '$_id',
          emotionName: 1,
          emotionCategory: 1,
          emotionIcon: 1,
          totalResponses: 1,
          uniqueUsersCount: 1,
          distinctActivitiesCount: 1,
          avgScore: { $round: ['$avgScore', 1] },
        },
      },
    ];

    return this.userResponseModel.aggregate(pipeline);
  }

  // ─── Trend ──────────────────────────────────────

  async getTrend(filter: ReportFilterDto): Promise<TrendPoint[]> {
    const dateMatch = await this.buildUserResponseMatch(filter);
    const granularity = filter.granularity ?? 'day';

    let format: string;
    switch (granularity) {
      case 'week':
        format = '%Y-W%V';
        break;
      case 'month':
        format = '%Y-%m';
        break;
      default:
        format = '%Y-%m-%d';
    }

    return this.userResponseModel.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: '$startTime',
              timezone: COLOMBIA_TZ,
            },
          },
          totalResponses: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          avgScore: { $avg: '$score' },
        },
      },
      {
        $addFields: {
          uniqueUsersCount: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalResponses: 1,
          uniqueUsersCount: 1,
          avgScore: { $round: ['$avgScore', 1] },
        },
      },
    ]);
  }

  // ─── User Profile ───────────────────────────────

  async getUserProfile(userId: string): Promise<UserProfile> {
    const [user] = await this.userModel.find({ _id: userId }).lean();
    const [participant] = await this.participantModel.find({ userId }).lean();
    if (!user) throw new Error('Usuario no encontrado');

    // Estadísticas agregadas
    const [statsResult] = await this.userResponseModel.aggregate([
      { $match: { user: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          totalScore: { $sum: '$score' },
          avgScore: { $avg: '$score' },
          totalTime: { $sum: { $subtract: ['$endTime', '$startTime'] } },
        },
      },
    ]);

    // Actividad reciente (últimas 10)
    const recentRaw = await this.userResponseModel.aggregate([
      { $match: { user: new Types.ObjectId(userId) } },
      { $sort: { startTime: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'activities',
          localField: 'activity',
          foreignField: '_id',
          as: 'activityInfo',
        },
      },
      { $unwind: { path: '$activityInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          activityTitle: '$activityInfo.title',
          score: 1,
          date: '$startTime',
        },
      },
    ]);

    return {
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email || '',
        documentNumber: user.documentNumber || '',
        avatar: (user as any).avatar,
      },
      participant: {
        nickname: participant?.nickname || user.name,
        points: participant?.points || 0,
        level: participant?.level || 'bronce',
        currentStreak: participant?.currentStreak || 0,
        maxStreak: participant?.maxStreak || 0,
        totalActivitiesCompleted: participant?.totalActivitiesCompleted || 0,
        lastActivityDate: participant?.lastActivityDate
          ? new Date(participant.lastActivityDate).toISOString()
          : undefined,
      },
      stats: {
        avgScore: statsResult ? Math.round(statsResult.avgScore * 10) / 10 : 0,
        totalScore: statsResult?.totalScore || 0,
        totalTimeMinutes: statsResult
          ? Math.round((statsResult.totalTime / 60000) * 10) / 10
          : 0,
        totalResponses: statsResult?.totalResponses || 0,
      },
      recentActivity: recentRaw.map((r) => ({
        activityTitle: r.activityTitle || 'Actividad eliminada',
        score: r.score,
        date: r.date
          ? new Date(r.date).toLocaleDateString('en-CA', {
              timeZone: 'America/Bogota',
            })
          : '',
      })),
    };
  }

  // ─── Scores Distribution ────────────────────────

  async getScores(filter: ReportFilterDto): Promise<ScoreDistribution[]> {
    const dateMatch = await this.buildUserResponseMatch(filter);
    if (filter.activityId) {
      dateMatch.activity = filter.activityId;
    }

    const boundaries = [0, 20, 40, 60, 80, 100];

    const results = await this.userResponseModel.aggregate([
      { $match: dateMatch },
      {
        $bucket: {
          groupBy: '$score',
          boundaries,
          default: '100+',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const total = results.reduce((acc, r) => acc + r.count, 0);

    return results.map((r) => ({
      range: r._id === '100+' ? '100' : `${r._id}-${r._id + 19}`,
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
    }));
  }
}
