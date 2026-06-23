import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { Model, PipelineStage, Types } from 'mongoose';
import { WeeklySchedule } from '../activities/schemas/weekly-schedule.schema';
import { CreateParticipantDto } from './dto/create-participant.dto';
import {
  UpdateParticipantDto,
  UpdatePointsDto,
} from './dto/update-participant.dto';
import { Participant, calculateLevel } from './schemas/participant.schema';
import { Company } from '../company/schemas/company.schema';

@Injectable()
export class ParticipantService {
  constructor(
    @InjectModel(Participant.name)
    private participantModel: Model<Participant>,
    @InjectModel(WeeklySchedule.name)
    private weeklyScheduleModel: Model<WeeklySchedule>,
    @InjectModel(Company.name)
    private companyModel: Model<Company>,
  ) {}

  // ─── NUEVO: Crear participante desde registro de User ───
  async create(createParticipantDto: CreateParticipantDto) {
    const existing = await this.participantModel.findOne({
      userId: createParticipantDto.userId,
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un participante para este usuario',
      );
    }

    const participant = new this.participantModel({
      ...createParticipantDto,
      points: 0,
      level: 'bronce',
      currentStreak: 0,
      maxStreak: 0,
      totalActivitiesCompleted: 0,
    });
    return participant.save();
  }

  // ─── NUEVO: Obtener participante por userId ───
  async findByUserId(userId: string) {
    const participant = await this.participantModel.findOne({ userId });
    if (!participant) {
      throw new NotFoundException(
        'Participante no encontrado para este usuario',
      );
    }
    return participant;
  }

  // ─── Obtener historial de actividad por día ───
  async getActivityHistory(id: string, days: number = 30) {
    const participant = await this.participantModel.findById(id);
    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }

    const userId = participant.userId;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const pipeline: PipelineStage[] = [
      { $match: { participants: new Types.ObjectId(userId) } },
      { $unwind: '$days' },
      {
        $match: {
          'days.status': 'completed',
          'days.date': { $gte: sinceDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$days.date' },
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
    ];

    const history = await this.weeklyScheduleModel.aggregate(pipeline);

    // Rellenar días sin actividad con count=0
    const result: { date: string; count: number }[] = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = history.find((h) => h.date === dateStr);
      result.push({ date: dateStr, count: found ? found.count : 0 });
    }

    return { history: result };
  }

  // ─── Obtener leaderboard del curso ───
  async getLeaderboard(courseId: string, limit: number = 20) {
    const filter: any = { isActive: true };
    if (
      courseId &&
      courseId !== 'undefined' &&
      Types.ObjectId.isValid(courseId)
    ) {
      filter.currentCourse = new Types.ObjectId(courseId);
    }

    const participants = await this.participantModel
      .find(filter)
      .select('userId nickname points level avatar currentCourse')
      .populate('currentCourse', 'name companyId')
      .sort({ points: -1 })
      .limit(limit)
      .lean();

    const totalCount = await this.participantModel.countDocuments(filter);

    // Collect unique companyIds from courses
    const companyIds = [
      ...new Set(
        participants
          .map((p: any) => p.currentCourse?.companyId)
          .filter(Boolean),
      ),
    ];

    // Look up company names
    const companies =
      companyIds.length > 0
        ? await this.companyModel
            .find({
              _id: { $in: companyIds.map((id) => new Types.ObjectId(id)) },
            })
            .select('name')
            .lean()
        : [];
    const companyMap = new Map(
      companies.map((c: any) => [c._id.toString(), (c as any).name]),
    );

    const leaderboard = participants.map((p: any, index) => ({
      rank: index + 1,
      userId: p.userId,
      nickname: p.nickname,
      level: p.level,
      points: p.points,
      avatar: p.avatar,
      course: p.currentCourse
        ? {
            name: (p.currentCourse as any).name,
            companyId: (p.currentCourse as any).companyId,
            companyName:
              companyMap.get((p.currentCourse as any).companyId?.toString()) ||
              null,
          }
        : null,
    }));

    return { leaderboard, totalCount };
  }

  // ─── NUEVO: Actualizar puntos con lógica de streak y level ───
  async updatePoints(id: string, dto: UpdatePointsDto) {
    const participant = await this.participantModel.findById(id);
    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }

    // Actualizar puntos
    participant.points += dto.pointsIncrement;

    // Recalcular level
    participant.level = calculateLevel(participant.points);

    // Actualizar streak si completó actividad
    if (dto.activityCompleted) {
      participant.totalActivitiesCompleted += 1;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (participant.lastActivityDate) {
        const lastDate = new Date(
          participant.lastActivityDate.getFullYear(),
          participant.lastActivityDate.getMonth(),
          participant.lastActivityDate.getDate(),
        );

        const diffDays = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 1) {
          // Día consecutivo
          participant.currentStreak += 1;
        } else if (diffDays > 1) {
          // Se rompió la racha
          participant.currentStreak = 1;
        }
        // diffDays === 0: misma actividad el mismo día, no cambiar streak
      } else {
        // Primera actividad
        participant.currentStreak = 1;
      }

      // Actualizar récord de racha
      if (participant.currentStreak > participant.maxStreak) {
        participant.maxStreak = participant.currentStreak;
      }

      participant.lastActivityDate = now;
    }

    await participant.save();

    return {
      points: participant.points,
      level: participant.level,
      currentStreak: participant.currentStreak,
      maxStreak: participant.maxStreak,
      totalActivitiesCompleted: participant.totalActivitiesCompleted,
      lastActivityDate: participant.lastActivityDate,
    };
  }

  // ─── LEGACY: Carga masiva desde CSV ───
  async createMany(file: Express.Multer.File) {
    const fileContent = readFileSync(file.path, 'utf8');
    const participantsData = await parse(fileContent, { columns: true });
    const participants = [];

    for await (const row of participantsData) {
      participants.push({
        name: row['name'],
        nit: row['nit'],
        epsCode: row['epsCode'],
        address: row['address'],
        phoneNumber: row['phoneNumber'],
        email: row['email'],
        createdAt: new Date(Date.now()),
        createdBy: row['createdBy'],
        managerData: {
          name: row['managerName'],
          document: row['managerDocument'],
          documentType: row['managerDocumentType'],
          email: row['managerEmail'],
          phoneNumber: row['managerPhoneNumber'],
        },
        overdueInvoiceIds: [''],
        totalDebt: 0,
        daysInArrears: 0,
        creditLimit: 0,
        avatar: '03.jpg',
      });
    }

    return this.participantModel.insertMany(participants);
  }

  // ─── LEGACY: Listar con paginación ───
  async findAll(query: any) {
    const { rows, page, dateFilter, limit } = query;
    const filter: any = {};

    if (dateFilter) {
      filter.createdAt = {};
      if (dateFilter.startDate) {
        filter.createdAt.$gte = dateFilter.startDate;
      }
      if (dateFilter.endDate) {
        filter.createdAt.$lte = dateFilter.endDate;
      }
    }

    const recordLimit = limit ? parseInt(limit) : rows ? parseInt(rows) : 10;
    const skip = rows && page ? recordLimit * (parseInt(page) - 1) : 0;

    return {
      participants: await this.participantModel
        .find(filter)
        .skip(skip)
        .limit(recordLimit)
        .sort({ name: 1 }),
      count: await this.participantModel.countDocuments(filter),
    };
  }

  // ─── LEGACY: Contar todos ───
  async getCountAll(query: any) {
    const count = await this.participantModel.countDocuments(query).exec();
    return { count };
  }

  // ─── LEGACY: Buscar por texto ───
  async search(searchTerm: string) {
    const regex = new RegExp(searchTerm, 'i');
    const query = {
      $or: [
        { name: { $regex: regex } },
        { nickname: { $regex: regex } },
        { nit: { $regex: regex } },
        { address: { $regex: regex } },
        { phoneNumber: { $regex: regex } },
        { email: { $regex: regex } },
      ],
    };

    return this.participantModel
      .find(searchTerm === 'all' ? {} : query)
      .sort({ name: -1 });
  }

  // ─── LEGACY: Obtener por _id ───
  async findOne(id: string) {
    return this.participantModel.findById(id);
  }

  // ─── LEGACY: Actualizar ───
  async update(updateParticipantDto: UpdateParticipantDto) {
    const participant = await this.participantModel.findById(
      updateParticipantDto._id,
    );
    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }

    Object.assign(participant, updateParticipantDto);
    participant.editedAt = new Date(Date.now());
    return participant.save();
  }

  // ─── LEGACY: Eliminar ───
  async remove(id: string) {
    return this.participantModel.findByIdAndDelete(id);
  }
}
