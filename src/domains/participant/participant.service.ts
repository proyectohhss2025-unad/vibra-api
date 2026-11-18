import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { Model, PipelineStage, Types } from 'mongoose';
import { WeeklySchedule } from '../activities/schemas/weekly-schedule.schema';
import { ActivityCompletion } from '../activity-completions/schemas/activity-completion.schema';
import { Company } from '../company/schemas/company.schema';
import { User } from '../users/schemas/user.schema';
import { CreateParticipantDto } from './dto/create-participant.dto';
import {
  UpdateParticipantDto,
  UpdatePointsDto,
} from './dto/update-participant.dto';
import { Participant, calculateLevel } from './schemas/participant.schema';

@Injectable()
export class ParticipantService {
  constructor(
    @InjectModel(Participant.name)
    private participantModel: Model<Participant>,
    @InjectModel(WeeklySchedule.name)
    private weeklyScheduleModel: Model<WeeklySchedule>,
    @InjectModel(Company.name)
    private companyModel: Model<Company>,
    @InjectModel(ActivityCompletion.name)
    private completionModel: Model<ActivityCompletion>,
    @InjectModel(User.name)
    private userModel: Model<User>,
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
  /**
   * Participante del usuario, **con su nombre real**.
   *
   * El móvil saludaba con «¡Hola, participante!» y mostraba «@participante»
   * porque `POST /api/auth/login` devuelve solo `{ access_token }`: el cliente
   * nunca tuvo un nombre y el participante se creaba con el literal
   * `nickname: 'participante'` (DEC-10, opción b). Aquí se añade `studentName`
   * y `username` tomados del usuario, sin cambiar el tipo de `userId` para no
   * romper a quien lo compare con un string.
   */
  async findByUserId(
    userId: string,
  ): Promise<Record<string, any>> {
    const participant = await this.participantModel
      .findOne({ userId })
      .lean()
      .exec();
    if (!participant) {
      throw new NotFoundException(
        'Participante no encontrado para este usuario',
      );
    }

    const user = await this.userModel
      .findById(userId)
      .select('name username email avatar')
      .lean()
      .exec();

    return {
      ...participant,
      studentName: (user as any)?.name ?? null,
      username: (user as any)?.username ?? null,
      email: (user as any)?.email ?? null,
      userAvatar: (user as any)?.avatar ?? null,
    };
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

    // A-05: el gráfico «Actividades completadas» se alimentaba de
    // `weeklySchedule.days[].status`, que es el CALENDARIO PLANIFICADO, no lo
    // que el participante hizo. Si la programación no estaba marcada como
    // completada, el gráfico salía vacío aunque hubiera decenas de actividades
    // entregadas. La fuente real es `activitycompletions`.
    const pipeline: PipelineStage[] = [
      {
        $match: {
          participant: new Types.ObjectId(String(participant._id)),
          completedAt: { $gte: sinceDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$completedAt',
              // El día se cuenta en hora de Colombia, igual que en los reportes.
              timezone: 'America/Bogota',
            },
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

    const history = await this.completionModel.aggregate(pipeline);

    // Rellenar días sin actividad con count=0, con la misma referencia horaria.
    const result: { date: string; count: number }[] = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-CA', {
        timeZone: 'America/Bogota',
      });
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
      .limit(limit * 2)
      .lean();

    // Deduplicar por userId: un usuario puede tener varios participantes
    // (uno por curso/inscripción) y aparecer repetido en el ranking.
    // Se conserva el de mayor puntaje para que cada usuario tenga una sola posición.
    const uniqueByUser = new Map<string, any>();
    for (const p of participants) {
      const uid = String(p.userId);
      const existing = uniqueByUser.get(uid);
      if (!existing || (p.points ?? 0) > (existing.points ?? 0)) {
        uniqueByUser.set(uid, p);
      }
    }
    const uniqueParticipants = Array.from(uniqueByUser.values()).slice(
      0,
      limit,
    );

    // Total de usuarios únicos en el ranking (no de documentos participant)
    const totalCount = (await this.participantModel.distinct('userId', filter))
      .length;

    // Collect unique companyIds from courses
    const companyIds = [
      ...new Set(
        uniqueParticipants
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

    const leaderboard = uniqueParticipants.map((p: any, index) => ({
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

  /**
   * Actualiza los puntos del participante dueño de la sesión.
   * Evita que el cliente envíe el `_id` del participante.
   */
  async updatePointsByUserId(userId: string, dto: UpdatePointsDto) {
    const participant = await this.participantModel.findOne({ userId });
    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }
    return this.updatePoints(String(participant._id), dto);
  }

  // ─── NUEVO: Actualizar puntos con lógica de streak y level ───
  async updatePoints(id: string, dto: UpdatePointsDto) {
    const participant = await this.participantModel.findById(id);
    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }

    // Actualizar puntos (enteros: el cliente recibe `points` y lo pinta tal cual)
    participant.points = Math.round(participant.points + dto.pointsIncrement);

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
    const { rows, page, dateFilter, limit, searchTerm } = query;
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

    // Búsqueda unificada: campos del participante + datos del usuario asociado
    // (nombre completo, usuario, correo y documento). Reemplaza al endpoint
    // legacy `/api/participants/search` para el panel web.
    const term = typeof searchTerm === 'string' ? searchTerm.trim() : '';
    if (term && term.toLowerCase() !== 'all') {
      const regex = this.buildRegex(term);
      const userIds = await this.findUserIdsByTerm(regex);
      filter.$or = [
        { nickname: regex },
        { name: regex },
        { email: regex },
        { phoneNumber: regex },
        { nit: regex },
        { userId: { $in: userIds } },
      ];
    }

    const recordLimit = limit ? parseInt(limit) : rows ? parseInt(rows) : 10;
    const skip = rows && page ? recordLimit * (parseInt(page) - 1) : 0;

    const [participants, count] = await Promise.all([
      this.participantModel
        .find(filter)
        .skip(skip)
        .limit(recordLimit)
        .sort({ name: 1 })
        .populate('userId', 'name username')
        .lean()
        .exec(),
      this.participantModel.countDocuments(filter),
    ]);

    return {
      participants: participants.map((p: any) => this.toListResponse(p)),
      count,
    };
  }

  /**
   * Regex insensible a mayúsculas y seguro ante caracteres especiales
   * (`(`, `+`, `*`, etc.) que de otro modo romperían la consulta.
   */
  private buildRegex(term: string): RegExp {
    return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  /**
   * Ids de usuarios que coinciden con el término (nombre completo, usuario,
   * correo o documento). Se usa para filtrar participantes por su estudiante.
   */
  private async findUserIdsByTerm(regex: RegExp): Promise<Types.ObjectId[]> {
    const users = await this.participantModel.db
      .collection('users')
      .find(
        {
          $or: [
            { name: regex },
            { username: regex },
            { email: regex },
            { documentNumber: regex },
          ],
        },
        { projection: { _id: 1 } },
      )
      .limit(2000)
      .toArray();

    return users.map((u: any) => u._id);
  }

  /**
   * Normaliza un participante para listados: deja `userId` como string
   * (el `populate` lo convierte en documento) y expone `studentName`
   * con el nombre completo del usuario asociado.
   */
  private toListResponse(participant: any) {
    const user = participant?.userId;
    return {
      ...participant,
      userId: user?._id ? String(user._id) : user ? String(user) : '',
      studentName: user?.name ?? null,
    };
  }

  // ─── Dashboard: Total participantes + último participante activo ───
  async getOverviewStats() {
    const count = await this.participantModel
      .countDocuments({ isActive: true })
      .exec();

    // Buscar la participación más reciente en activitycompletions
    const lastCompletion = await this.completionModel
      .findOne()
      .sort({ completedAt: -1 })
      .populate({
        path: 'participant',
        select:
          'nickname avatar points level currentStreak maxStreak totalActivitiesCompleted lastActivityDate currentCourse userId',
        populate: { path: 'currentCourse', select: 'name' },
      })
      .populate('activity', 'title')
      .lean()
      .exec();

    let lastParticipant = null;
    if (lastCompletion?.participant) {
      const p = lastCompletion.participant as any;

      // Obtener avatar del usuario real desde la colección users
      let userAvatar = p.avatar;
      if (!userAvatar && p.userId) {
        const userIdStr = p.userId._id?.toString() || p.userId.toString?.();
        if (userIdStr) {
          const userDoc = await this.participantModel.db
            .collection('users')
            .findOne(
              { _id: new Types.ObjectId(userIdStr) },
              { projection: { avatar: 1 } },
            );
          userAvatar = (userDoc as any)?.avatar || null;
        }
      }

      lastParticipant = {
        participantId: p._id?.toString(),
        nickname: p.nickname,
        avatar: userAvatar,
        points: p.points,
        level: p.level,
        currentStreak: p.currentStreak,
        maxStreak: p.maxStreak,
        totalActivitiesCompleted: p.totalActivitiesCompleted,
        lastActivityDate: p.lastActivityDate,
        course: p.currentCourse
          ? {
              _id: p.currentCourse._id?.toString(),
              name: (p.currentCourse as any).name,
            }
          : null,
        lastParticipation: {
          completedAt: (lastCompletion as any).completedAt,
          activityTitle:
            ((lastCompletion as any).activity as any)?.title || null,
          achievedScore: (lastCompletion as any).achievedScore,
          plannedScore: (lastCompletion as any).plannedScore,
        },
      };
    }

    return { count, lastParticipant };
  }

  // ─── LEGACY: Contar todos ───
  async getCountAll(query: any) {
    const count = await this.participantModel.countDocuments(query).exec();
    return { count };
  }

  // ─── LEGACY: Buscar por texto ───
  async search(searchTerm: string) {
    const regex = this.buildRegex(searchTerm);
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

    const participants = await this.participantModel
      .find(searchTerm === 'all' ? {} : query)
      .sort({ name: -1 })
      .populate('userId', 'name username')
      .lean()
      .exec();

    return participants.map((p: any) => this.toListResponse(p));
  }

  // ─── LEGACY: Obtener por _id ───
  async findOne(id: string) {
    return this.participantModel.findById(id);
  }

  /**
   * Devuelve el `userId` dueño de un participante (para validar propiedad).
   * `null` si el participante no existe o el id no es válido.
   */
  async getOwnerId(id: string): Promise<string | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const participant = await this.participantModel
      .findById(id)
      .select('userId')
      .lean()
      .exec();

    return participant?.userId ? String(participant.userId) : null;
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
