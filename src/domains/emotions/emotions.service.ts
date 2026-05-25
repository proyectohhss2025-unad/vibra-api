import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { CreateEmotionDto, UpdateEmotionDto } from './dto/create-emotion.dto';
import { Emotion } from './schemas/emotion.schema';
import { Activity } from '../activities/schemas/activity.schema';
import { UserResponse } from '../userResponses/schemas/userResponse.schema';

@Injectable()
export class EmotionsService {
  constructor(
    @InjectModel(Emotion.name) private emotionModel: Model<Emotion>,
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
    @InjectModel(UserResponse.name) private userResponseModel: Model<UserResponse>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.log('EmotionsService initialized');
  }

  async create(createEmotionDto: CreateEmotionDto): Promise<Emotion> {
    this.logger.log(`Creating a new emotion...`);
    const createdEmotion = new this.emotionModel({ ...createEmotionDto });
    return createdEmotion.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Emotion[]; total: number }> {
    this.logger.log('Fetching paginated emotions...');
    const skip = (page - 1) * limit;
    const data = await this.emotionModel
      .find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    const total = await this.emotionModel.countDocuments().exec();
    return { data, total };
  }

  async findById(id: string): Promise<Emotion> {
    this.logger.log(`Finding emotion by _id: ${id}`);
    const emotion = await this.emotionModel.findById(id).exec();
    if (!emotion) {
      throw new NotFoundException(`Emoción con id ${id} no encontrada`);
    }
    return emotion;
  }

  async findByName(name: string): Promise<Emotion | undefined> {
    this.logger.log(`Finding emotion by name: ${name}`);
    return this.emotionModel.findOne({ name }).exec();
  }

  async update(
    id: string,
    updateEmotionDto: UpdateEmotionDto,
  ): Promise<Emotion> {
    this.logger.log(`Updating emotion ${id}...`);
    const updated = await this.emotionModel
      .findByIdAndUpdate(id, { $set: updateEmotionDto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Emoción con id ${id} no encontrada`);
    }
    return updated;
  }

  async softDelete(id: string): Promise<Emotion> {
    this.logger.log(`Soft-deleting emotion ${id}...`);
    const deleted = await this.emotionModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();
    if (!deleted) {
      throw new NotFoundException(`Emoción con id ${id} no encontrada`);
    }
    return deleted;
  }

  /**
   * Construye el pipeline base con filtros opcionales de fecha y curso.
   */
  private buildBasePipeline(
    startDate?: string,
    endDate?: string,
    courseId?: string,
    dateField: string = 'createdAt',
  ): any[] {
    const pipeline: any[] = [];

    // Filtro por rango de fechas
    if (startDate || endDate) {
      const dateMatch: any = {};
      if (startDate) dateMatch.$gte = new Date(startDate);
      if (endDate) dateMatch.$lte = new Date(endDate);
      pipeline.push({ $match: { [dateField]: dateMatch } });
    }

    // Filtro por curso: lookup a participants para obtener userIds del curso
    if (courseId) {
      pipeline.push(
        {
          $lookup: {
            from: 'participants',
            let: { userId: '$user' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$userId'] },
                      { $eq: ['$currentCourse', courseId] },
                    ],
                  },
                },
              },
            ],
            as: 'participant',
          },
        },
        { $match: { 'participant.0': { $exists: true } } },
      );
    }

    return pipeline;
  }

  /**
   * Obtiene la distribución de emociones registradas en user responses.
   * Agrupa por emoción (nombre) y cuenta cuántas veces fue seleccionada.
   */
  async getDistribution(
    startDate?: string,
    endDate?: string,
    courseId?: string,
  ): Promise<{ name: string; value: number; icono: string }[]> {
    this.logger.log('Fetching emotion distribution...');

    const pipeline: any[] = this.buildBasePipeline(startDate, endDate, courseId);

    pipeline.push(
      {
        $lookup: {
          from: 'activities',
          localField: 'activity',
          foreignField: '_id',
          as: 'activity',
        },
      },
      { $unwind: '$activity' },
      {
        $lookup: {
          from: 'emotions',
          localField: 'activity.emotion',
          foreignField: '_id',
          as: 'emotion',
        },
      },
      { $unwind: '$emotion' },
      {
        $group: {
          _id: '$emotion.name',
          value: { $sum: 1 },
          icono: { $first: '$emotion.icono' },
        },
      },
      { $sort: { value: -1 } },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1,
          icono: 1,
        },
      },
    );

    const result = await this.userResponseModel.aggregate(pipeline);
    return result;
  }

  /**
   * Obtiene la evolución temporal de emociones registradas por día.
   * @param days - Número de días hacia atrás (default: 30)
   */
  async getEvolution(
    days: number = 30,
    startDate?: string,
    endDate?: string,
    courseId?: string,
  ): Promise<{ date: string; count: number }[]> {
    this.logger.log(`Fetching emotion evolution...`);

    let since: Date;
    let until: Date;

    if (startDate) {
      since = new Date(startDate);
    } else {
      since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      until = new Date(endDate);
      until.setHours(23, 59, 59, 999);
    } else {
      until = new Date();
    }

    const pipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: since, $lte: until },
        },
      },
    ];

    // Filtro por curso
    if (courseId) {
      pipeline.push(
        {
          $lookup: {
            from: 'participants',
            let: { userId: '$user' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$userId'] },
                      { $eq: ['$currentCourse', courseId] },
                    ],
                  },
                },
              },
            ],
            as: 'participant',
          },
        },
        { $match: { 'participant.0': { $exists: true } } },
      );
    }

    pipeline.push(
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1,
        },
      },
    );

    const result = await this.userResponseModel.aggregate(pipeline);

    // Calcular rango de días para rellenar
    const diffDays = Math.round((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.max(diffDays, days);

    // Rellenar días sin datos con 0
    const countsMap = new Map(result.map((r) => [r.date, r.count]));
    const fullRange: { date: string; count: number }[] = [];
    for (let i = totalDays; i >= 0; i--) {
      const d = new Date(until);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      fullRange.push({ date: dateStr, count: countsMap.get(dateStr) ?? 0 });
    }

    return fullRange;
  }
}
