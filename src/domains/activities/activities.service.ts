import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserResponse } from 'src/domains/userResponses/schemas/userResponse.schema';
import { PushNotificationService } from 'src/domains/push-notifications/push-notifications.service';
import { AppLoggerService } from 'src/helpers/logger/logger.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { Activity } from './schemas/activity.schema';
import { WeeklySchedule } from './schemas/weekly-schedule.schema';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
    @InjectModel('WeeklySchedule')
    private weeklyScheduleModel: Model<WeeklySchedule>,
    @InjectModel(UserResponse.name)
    private userResponseModel: Model<UserResponse>,
    private readonly logger: AppLoggerService,
    private readonly pushNotificationService: PushNotificationService,
  ) { }

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const dto: any = createActivityDto;

    // Auto-generar id secuencial si no se provee (formato ACT-XXX)
    if (!dto.id) {
      const count = await this.activityModel.countDocuments().exec();
      dto.id = `ACT-${String(count + 1).padStart(3, '0')}`;
    }

    const createdActivity = new this.activityModel(dto);
    const savedActivity = await createdActivity.save();

    // Si la actividad tiene fecha y es para hoy, enviar notificación push
    if (savedActivity?.schedule?.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activityDate = new Date(savedActivity.schedule.date);
      activityDate.setHours(0, 0, 0, 0);

      if (activityDate.getTime() === today.getTime()) {
        this.logger.log('Activity created for today — sending push notifications');
        this.pushNotificationService
          .sendPushToAll(
            '🎉 ¡Nueva actividad disponible!',
            'Ya tienes una actividad para hoy. ¡Descúbrela ahora!',
            {
              url: '/features/(tabs)/one',
              type: 'new_activity',
            },
          )
          .catch((err) =>
            this.logger.error(`Error sending push notification: ${err.message}`),
          );
      }
    }

    return savedActivity;
  }

  async paginate(
    options: PaginationQueryDto,
    userId: string,
    query: any = {},
  ): Promise<{
    docs: Activity[];
    totalDocs: number;
    userResponse: UserResponse[];
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const baseQuery = { isActive: true, ...query };

    //console.log('baseQuery: ', userId);

    const [docs, totalDocs, userResponse] = await Promise.all([
      this.activityModel
        .find(baseQuery)
        .populate('emotion')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments(baseQuery).exec(),
      userId
        ? this.userResponseModel
          .find({ user: new Types.ObjectId(userId) })
          .populate('activity')
          .populate('user')
          .lean()
          .exec()
        : Promise.resolve([]),
    ]);
    //console.log('userResponse: ', userResponse);
    return {
      docs,
      totalDocs,
      userResponse,
      page,
      limit,
    };
  }

  async getActivitiesByMonth(
    year: number,
    courseId?: string,
  ): Promise<{ month: number; count: number }[]> {
    const matchStage: any = {
      startTime: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      },
    };

    const pipeline: any[] = [
      { $match: matchStage },
    ];

    // Si hay courseId, filtrar participantes que pertenecen a ese curso
    if (courseId) {
      pipeline.push(
        {
          $lookup: {
            from: 'participants',
            localField: 'user',
            foreignField: 'userId',
            as: 'participant',
          },
        },
        { $unwind: { path: '$participant', preserveNullAndEmptyArrays: false } },
        { $match: { 'participant.currentCourse': courseId } },
      );
    }

    pipeline.push(
      {
        $group: {
          _id: { $month: '$startTime' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: '$_id',
          count: 1,
        },
      },
    );

    const result = await this.userResponseModel.aggregate(pipeline);

    // Rellenar meses sin datos con 0
    const monthsMap = new Map(result.map((r) => [r.month, r.count]));
    const fullYear = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: monthsMap.get(i + 1) ?? 0,
    }));

    return fullYear;
  }

  async getCountAll(query: any) {
    return this.activityModel.countDocuments(query).exec();
  }

  async countByType(type: string): Promise<number> {
    return this.activityModel.countDocuments({ type, isActive: true, deleted: { $ne: true } }).exec();
  }
  async findById(id: string): Promise<Activity> {
    return this.activityModel.findById(id).exec();
  }

  async update(
    id: string,
    updateActivityDto: UpdateActivityDto,
  ): Promise<Activity> {
    // Construir $set manual para evitar problemas con class-transformer
    // que crea instancias de clase que Mongoose no serializa bien en subdocumentos.
    const dto: any = updateActivityDto;
    const $set: Record<string, any> = {};

    if (dto.title !== undefined) $set.title = dto.title;
    if (dto.description !== undefined) $set.description = dto.description;
    if (dto.emotion !== undefined) $set.emotion = dto.emotion;
    if (dto.difficulty !== undefined) $set.difficulty = dto.difficulty;
    if (dto.isActive !== undefined) $set.isActive = dto.isActive;
    if (dto.type !== undefined) $set.type = dto.type;
    if (dto.schedule !== undefined) $set.schedule = dto.schedule;
    if (dto.tips !== undefined) $set.tips = dto.tips;
    if (dto.games !== undefined) $set.games = dto.games;

    if (dto.resources !== undefined) {
      $set.resources = dto.resources.map((r: any) => ({ ...r }));
    }
    if (dto.questions !== undefined) {
      $set.questions = dto.questions.map((q: any) => ({ ...q }));
    }

    return this.activityModel
      .findByIdAndUpdate(id, { $set }, { new: true })
      .exec();
  }

  async softDelete(id: string): Promise<Activity> {
    return this.activityModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();
  }

  async getAvailableEmotions(): Promise<string[]> {
    return this.activityModel
      .find()
      .populate('emotion')
      .distinct('emotion')
      .exec()
      .then((emotions) =>
        emotions.map((emotion: any) => emotion._id.toString()),
      );
  }

  async getRandomEmotions(count: number): Promise<string[]> {
    const emotions = await this.getAvailableEmotions();
    return this.shuffleArray(emotions).slice(0, count);
  }

  async getTodaysActivity(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Normalizar fechas para comparación
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Buscar actividad donde schedule.date esté en el rango del día
    const activities = await this.activityModel.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          scheduleDateStr: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$schedule.date',
              timezone: 'UTC',
            },
          },
        },
      },
      {
        $match: {
          scheduleDateStr: {
            $gte: todayStr,
            $lt: tomorrowStr,
          },
        },
      },
      { $limit: 1 },
    ]);

    let activity = activities.length > 0 ? activities[0] : null;

    // Fallback: buscar por createdAt si no hay con schedule.date
    if (!activity) {
      const fallback = await this.activityModel
        .findOne({
          isActive: true,
          $or: [
            { schedule: { $exists: false } },
            { 'schedule.date': null },
          ],
          createdAt: { $gte: today, $lt: tomorrow },
        })
        .populate('emotion')
        .exec();

      if (fallback) {
        this.logger.log(`Getting today's activity (fallback by createdAt)...`);
        return {
          activity: fallback,
          schedule: {
            date: today,
            status: 'active',
          },
        };
      }
    }

    if (activity) {
      const populatedActivity = await this.activityModel
        .findById(activity._id)
        .populate('emotion')
        .exec();

      this.logger.log(`Getting today's activity... ${JSON.stringify(populatedActivity)}`);
      return {
        activity: populatedActivity,
        schedule: {
          date: activity.schedule?.date || today,
          status: 'active',
        },
      };
    }

    this.logger.log(`No activity found for today`);
    return {
      activity: null,
      schedule: {
        date: today,
        status: 'no_activity',
      },
    };
  }

  private shuffleArray(array: any[]): any[] {
    return array.sort(() => Math.random() - 0.5);
  }

  /**
   * Assigns activities to users based on their emotions
   * @param emotions - The list of emotions to assign activities to
   * @returns Promise containing an array of assigned activities
   */
  async assignActivities(emotions: string[]): Promise<Activity[]> {
    return Promise.all(
      emotions.map((emotion) => this.activityModel.find({ emotion })),
    ).then((results) => results.flat());
  }

  /**
   * Creates a weekly schedule for activities
   * @param scheduleData - The weekly schedule data to be created
   * @returns Promise containing the created or updated WeeklySchedule
   */
  async createWeeklySchedule(
    scheduleData: WeeklySchedule,
  ): Promise<WeeklySchedule> {
    const existingSchedule = await this.weeklyScheduleModel
      .findOne({
        weekNumber: scheduleData.weekNumber,
        year: scheduleData.year,
      })
      .exec();

    if (existingSchedule) {
      return this.weeklyScheduleModel
        .findByIdAndUpdate(
          existingSchedule._id,
          { $set: scheduleData },
          { new: true },
        )
        .exec();
    }

    const newSchedule = new this.weeklyScheduleModel(scheduleData);
    return newSchedule.save();
  }

  /**
   * Gets the current week number of the year
   * @returns The current week number
   */
  getCurrentWeek(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  }

  /**
   * Gets the list of active users
   * @returns Promise containing an array of active user IDs
   */
  async getActiveUsers(): Promise<string[]> {
    // This should be implemented in your UserService
    // For now, returning an empty array
    return ['67c21ed4f905699888106f03'];
  }

  /**
   * Calculates the date for a specific day in the next week
   * @param day - The day number to calculate
   * @returns Date object for the specified day in the next week
   */
  getNextWeekDate(day: number): Date {
    const now = new Date();
    const nextWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 7 * day,
    );
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek;
  }

  /**
   * Processes a user's response to an activity
   * @param userId - The ID of the user submitting the response
   * @param activityId - The ID of the activity being responded to
   * @param responseDto - The response data containing answers
   * @returns Promise containing the processed response results and score
   * @throws NotFoundException if the activity is not found
   */
  async processResponse(
    userId: string,
    activityId: string,
    responseDto: ActivityResponseDto,
  ): Promise<any> {
    this.logger.log(
      `Processing response for user ${userId} and activity ${activityId}`,
    );

    const activity = await this.findById(activityId);
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const results = responseDto.answers.map((answer) => {
      const question = activity.questions.find(
        (q: any) => q?.id.toString() == answer.questionId.toString(),
      );
      return {
        ...answer,
        isCorrect: question?.correctAnswer === answer.answer,
        points: question?.points || 0,
      };
    });

    const totalScore = results.reduce(
      (sum, result) => sum + (result.isCorrect ? result.points : 0),
      0,
    );

    const responseData = {
      user: new Types.ObjectId(userId),
      activity: new Types.ObjectId(activityId),
      responses: responseDto.answers.map((answer) => ({
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect: true, //results.find(r => r?.questionId === answer?.questionId)?.isCorrect || false,
        responseTime: 10,
      })),
      score: totalScore,
      startTime: new Date(),
      endTime: new Date(),
      timeSpent: 10,
    };

    const userResponse = await this.userResponseModel
      .findOne({
        activity: new Types.ObjectId(activityId),
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (userResponse) {
      await this.userResponseModel
        .findByIdAndUpdate(userResponse._id, {
          ...responseData,
          responses: [...userResponse.responses, ...responseData.responses],
        })
        .exec();
      return {
        activityId,
        userId,
        results,
        totalScore,
      };
    }

    await this.userResponseModel.create(responseData);
    return {
      activityId,
      userId,
      results,
      totalScore,
    };
  }

  /**
   * Find activities by user with optional type filter
   * @param userId - User ID
   * @param filters - Optional filters (type, page, limit)
   * @returns Paginated list of activities for the user
   */
  async findByUserId(
    userId: string,
    filters: { type?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: Activity[]; total: number; page: number; limit: number }> {
    const { type, page = 1, limit = 10 } = filters;

    // Buscar las respuestas del usuario
    const userResponses = await this.userResponseModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('activity')
      .lean()
      .exec();

    // Extraer las actividades de las respuestas
    let activityIds = userResponses
      .map((ur) => ur.activity?._id)
      .filter(Boolean);

    // Construir query para actividades
    const query: any = {
      _id: { $in: activityIds },
      isActive: true,
    };

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.activityModel
        .find(query)
        .populate('emotion')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments(query).exec(),
    ]);

    return { data, total, page, limit };
  }
}
