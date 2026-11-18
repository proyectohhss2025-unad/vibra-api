import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PushNotificationService } from 'src/domains/push-notifications/push-notifications.service';
import { UserResponse } from 'src/domains/userResponses/schemas/userResponse.schema';
import { AppLoggerService } from 'src/helpers/logger/logger.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { getColombiaDayRange, getColombiaWeekRange } from '../../utils/dates';
import { ActivityCompletion } from '../activity-completions/schemas/activity-completion.schema';
import { Participant } from '../participant/schemas/participant.schema';
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
    @InjectModel(Participant.name)
    private participantModel: Model<Participant>,
    @InjectModel(ActivityCompletion.name)
    private activityCompletionModel: Model<ActivityCompletion>,
    private readonly logger: AppLoggerService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Convierte una URL de recurso servida por esta API en una ruta relativa.
   * Así la actividad se guarda de forma portable: `http://localhost:4000/file-upload/...`
   * o `https://api.dominio.com/file-upload/...` se guardan como `/file-upload/...`
   * y cada cliente las resuelve contra su propia base.
   */
  private toStorageResourceUrl(url: string): string {
    const raw = (url ?? '').toString().trim();
    if (!raw) return raw;

    const localMatch =
      /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(?::\d+)?(\/.*)$/i.exec(
        raw,
      );
    if (localMatch) return localMatch[1];

    const publicBase = (process.env.MEDIA_PUBLIC_URL || '')
      .trim()
      .replace(/\/+$/, '');
    if (publicBase) {
      const baseNoScheme = publicBase.replace(/^https?:\/\//i, '').toLowerCase();
      const rawNoScheme = raw.replace(/^https?:\/\//i, '');
      if (rawNoScheme.toLowerCase().startsWith(`${baseNoScheme}/`)) {
        return raw.replace(/^https?:\/\/[^/]+/i, '');
      }
    }

    return raw;
  }

  /** Normaliza las URLs de los recursos de la actividad antes de guardarla. */
  private normalizeResourceUrlsForStorage(resources: any): any {
    if (!Array.isArray(resources)) return resources;
    return resources.map((resource: any) =>
      resource?.url
        ? { ...resource, url: this.toStorageResourceUrl(resource.url) }
        : resource,
    );
  }

  /**
   * Normaliza el tipo de actividad.
   * `actividad_pares` es el valor legado de "Actividad Diaria"; se traduce a
   * `actividad_diaria` para no persistir el nombre antiguo.
   */
  private normalizeActivityType(type?: string): string | undefined {
    return type === 'actividad_pares' ? 'actividad_diaria' : type;
  }

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const dto: any = createActivityDto;

    // Compatibilidad con clientes/datos antiguos: 'actividad_pares' → 'actividad_diaria'.
    if (dto.type !== undefined) {
      dto.type = this.normalizeActivityType(dto.type);
    }

    // Normalizar juegos a objetos planos: class-transformer crea instancias de
    // GameDto y Mongoose no las serializa bien como subdocumentos.
    if (Array.isArray(dto.games)) {
      dto.games = dto.games.map((game: any) => ({
        type: game.type,
        config: game.config,
        order: typeof game.order === 'number' ? game.order : 0,
      }));
    }

    // Guardar los recursos con ruta relativa (portabilidad entre entornos).
    if (Array.isArray(dto.resources)) {
      dto.resources = this.normalizeResourceUrlsForStorage(dto.resources);
    }

    // Auto-generar id secuencial si no se provee (formato ACT-XXX)
    if (!dto.id) {
      const count = await this.activityModel.countDocuments().exec();
      dto.id = `ACT-${String(count + 1).padStart(3, '0')}`;
    }

    const createdActivity = new this.activityModel(dto);
    const savedActivity = await createdActivity.save();

    // Si la actividad tiene fecha y es para hoy, enviar notificación push
    if (savedActivity?.schedule?.date) {
      const { todayStr } = getColombiaDayRange();
      const schedDate = savedActivity.schedule.date;
      const activityDateStr =
        schedDate instanceof Date
          ? schedDate.toLocaleDateString('en-CA', {
              timeZone: 'America/Bogota',
            })
          : String(schedDate).split('T')[0];

      if (activityDateStr === todayStr) {
        this.logger.log(
          'Activity created for today — sending push notifications',
        );
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
            this.logger.error(
              `Error sending push notification: ${err.message}`,
            ),
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

    const pipeline: any[] = [{ $match: matchStage }];

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
        {
          $unwind: { path: '$participant', preserveNullAndEmptyArrays: false },
        },
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

  /**
   * Obtiene actividades CREADAS agrupadas por mes para un año específico.
   * A diferencia de getActivitiesByMonth (que cuenta respuestas de usuarios),
   * esta función cuenta las actividades creadas en el sistema.
   */
  async getCreatedActivitiesByMonth(
    year: number,
  ): Promise<{ month: number; count: number }[]> {
    const matchStage: any = {
      createdAt: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
      {
        $project: {
          _id: 0,
          month: '$_id',
          count: 1,
        },
      },
    ];

    const result = await this.activityModel.aggregate(pipeline);

    // Rellenar meses sin datos con 0
    const monthsMap = new Map(result.map((r) => [r.month, r.count]));
    const fullYear = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: monthsMap.get(i + 1) ?? 0,
    }));

    return fullYear;
  }

  async getCountAll(query: any) {
    const filter: any = { ...query };
    // Soporte para filtro por rango de fechas en schedule.date
    if (query.dateInit || query.dateEnd) {
      const dateFilter: any = {};
      if (query.dateInit) dateFilter.$gte = new Date(query.dateInit);
      if (query.dateEnd) dateFilter.$lte = new Date(query.dateEnd);
      filter['schedule.date'] = dateFilter;
    }
    delete filter.dateInit;
    delete filter.dateEnd;
    const count = await this.activityModel.countDocuments(filter).exec();
    return { count };
  }

  async countByType(type: string): Promise<number> {
    return this.activityModel
      .countDocuments({ type, isActive: true, deleted: { $ne: true } })
      .exec();
  }

  // ─── Dashboard: total activas, total retos, última actividad, último reto ───
  async getOverviewStats() {
    const baseFilter = { isActive: true, deleted: { $ne: true } };

    const [totalCount, retosCount, lastActivity, lastReto] = await Promise.all([
      this.activityModel.countDocuments(baseFilter).exec(),
      this.activityModel.countDocuments({ ...baseFilter, type: 'reto' }).exec(),
      this.activityModel
        .findOne(baseFilter)
        .sort({ createdAt: -1 })
        .populate('emotion', 'name')
        .lean()
        .exec(),
      this.activityModel
        .findOne({ ...baseFilter, type: 'reto' })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);

    const mapActivity = (a: any) =>
      a
        ? {
            id: a.id,
            title: a.title,
            type: a.type,
            difficulty: a.difficulty,
            emotionName: a.emotion?.name || null,
            scheduleDate: a.schedule?.date || null,
            createdAt: a.createdAt,
          }
        : null;

    return {
      totalCount,
      retosCount,
      lastActivity: mapActivity(lastActivity),
      lastReto: mapActivity(lastReto),
    };
  }

  async findById(id: string): Promise<Activity> {
    const activity = await this.activityModel.findById(id).exec();
    return this.normalizeActivityMedia(activity);
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
    if (dto.type !== undefined) $set.type = this.normalizeActivityType(dto.type);
    if (dto.schedule !== undefined) $set.schedule = dto.schedule;
    if (dto.tips !== undefined) $set.tips = dto.tips;
    if (dto.games !== undefined) {
      // Objetos planos: evita que las instancias de GameDto lleguen a Mongoose.
      $set.games = (dto.games ?? []).map((game: any) => ({
        type: game.type,
        config: game.config,
        order: typeof game.order === 'number' ? game.order : 0,
      }));
    }

    if (dto.resources !== undefined) {
      // Objetos planos y URL relativa (portabilidad entre entornos).
      $set.resources = this.normalizeResourceUrlsForStorage(
        dto.resources.map((r: any) => ({ ...r })),
      );
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

  /**
   * Desactiva actividades cuya fecha de programación ya pasó.
   * Se ejecuta diariamente desde un cron job.
   * Compara schedule.date contra el inicio del día actual en Colombia (UTC-5).
   * @returns Número de actividades desactivadas
   */
  async deactivateExpiredActivities(): Promise<number> {
    const { start } = getColombiaDayRange();

    const result = await this.activityModel
      .updateMany(
        {
          isActive: true,
          'schedule.date': { $lt: start },
        },
        { $set: { isActive: false, updatedAt: new Date() } },
      )
      .exec();

    if (result.modifiedCount > 0) {
      this.logger.log(
        `[ExpiredActivities] ${result.modifiedCount} actividad(es) desactivada(s) por fecha vencida`,
      );
    }

    return result.modifiedCount;
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

  /**
   * Reescribe las URLs de recursos que apuntan a una base local (localhost, 127.0.0.1, 0.0.0.0)
   * por la base pública definida en `MEDIA_PUBLIC_URL`. Así los archivos servidos por
   * `/file-upload/stream/:id` cargan también desde un dispositivo físico.
   * Si la variable no está definida, la URL se devuelve sin cambios.
   */
  private normalizeActivityMedia<T>(activity: T): T {
    const base = (process.env.MEDIA_PUBLIC_URL || '').trim().replace(/\/+$/, '');
    if (!base) return activity;

    const resources = (activity as any)?.resources;
    if (!Array.isArray(resources)) return activity;

    const localOrigin =
      /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(\/.*)?$/i;

    resources.forEach((resource: any) => {
      if (!resource?.url) return;

      // URL relativa (formato que devuelve el endpoint de subida)
      if (String(resource.url).startsWith('/')) {
        resource.url = `${base}${resource.url}`;
        return;
      }

      const match = String(resource.url).match(localOrigin);
      if (!match) return;
      resource.url = `${base}${match[1] || ''}`;
    });

    return activity;
  }

  /**
   * Actividades disponibles para hoy.
   *
   * Incluye:
   *  - Actividades activas programadas para la fecha actual (día Colombia).
   *  - Actividades activas SIN fecha de programación: quedan disponibles
   *    todos los días hasta que el usuario las complete.
   *
   * Orden: primero las programadas para hoy, luego las sin fecha; dentro de
   * cada grupo por dificultad y fecha de creación.
   *
   * @param userId - Usuario para marcar `completed` / `score` (opcional)
   * @param filters.type - Tipo a cargar; por defecto `actividad_diaria`
   *   (Actividad Diaria). `all` devuelve todos los tipos (vistas administrativas).
   */
  async getTodaysActivities(
    userId?: string,
    filters: { type?: string; limit?: number } = {},
  ): Promise<{
    activities: any[];
    count: number;
    schedule: { date: Date; status: 'active' | 'no_activity' };
  }> {
    const { todayStr, tomorrowStr, start } = getColombiaDayRange();

    // El flujo diario sólo carga actividades de tipo "Actividad Diaria"
    // (`actividad_diaria`). `type=all` se mantiene para vistas administrativas
    // (p. ej. el conteo de actividades de hoy del dashboard).
    const requestedType: string =
      filters.type === 'all'
        ? 'all'
        : this.normalizeActivityType(filters.type) || 'actividad_diaria';

    // El filtro por tipo va en el primer $match para aprovechar el índice
    // `type_1`; los cálculos de fecha de $addFields no lo permitirían después.
    const initialMatch: any = { isActive: true };
    if (requestedType !== 'all') {
      if (requestedType === 'evento_personal') {
        // 'evento_personal' es el tipo por defecto del schema: incluye también
        // actividades creadas antes de esta característica (sin `type`).
        initialMatch.$or = [
          { type: 'evento_personal' },
          { type: { $exists: false } },
        ];
      } else {
        initialMatch.type = requestedType;
      }
    }

    // Soportar datos guardados como UTC (antiguos) y Colombia (nuevos),
    // además de actividades sin fecha programada.
    const pipeline: any[] = [
      { $match: initialMatch },
      {
        $addFields: {
          scheduleDateStr: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$schedule.date',
              timezone: 'America/Bogota',
            },
          },
          scheduleDateUtc: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$schedule.date',
              timezone: 'UTC',
            },
          },
          undated: {
            $cond: [
              { $eq: [{ $ifNull: ['$schedule.date', null] }, null] },
              1,
              0,
            ],
          },
        },
      },
      {
        $match: {
          $or: [
            { scheduleDateStr: { $gte: todayStr, $lt: tomorrowStr } },
            { scheduleDateUtc: { $gte: todayStr, $lt: tomorrowStr } },
            { 'schedule.date': null },
          ],
        },
      },
    ];

    pipeline.push({
      $sort: {
        undated: 1,
        'schedule.date': 1,
        difficulty: 1,
        createdAt: 1,
      },
    });
    // Tope de seguridad: el listado diario no debe crecer sin límite.
    pipeline.push({ $limit: filters.limit ?? 50 });
    pipeline.push({ $project: { _id: 1 } });

    const ordered = await this.activityModel.aggregate(pipeline).exec();
    const ids = ordered.map((row) => row._id);

    // Respuestas del usuario para marcar completadas (una consulta por listado)
    let responsesByActivity = new Map<string, any>();
    if (userId && Types.ObjectId.isValid(userId)) {
      const responses = await this.userResponseModel
        .find({ user: new Types.ObjectId(userId), activity: { $in: ids } })
        .select('activity score responses')
        .lean()
        .exec();

      responsesByActivity = new Map<string, any>(
        responses.map((r: any) => [String(r.activity), r] as [string, any]),
      );
    }

    const documents = ids.length
      ? await this.activityModel
          .find({ _id: { $in: ids } })
          .populate('emotion')
          .exec()
      : [];
    const documentsById = new Map<string, any>(
      documents.map((doc: any) => [String(doc._id), doc] as [string, any]),
    );

    const activities = ids
      .map((id) => documentsById.get(String(id)))
      .filter(Boolean)
      .map((doc: any) => {
        const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
        const response = responsesByActivity.get(String(plain._id));

        // Misma regla que GET /:id/check-response: con preguntas, la actividad
        // sólo está completada cuando hay respuesta para todas.
        const questionsCount = Array.isArray(plain.questions)
          ? plain.questions.length
          : 0;
        const answeredCount = Array.isArray(response?.responses)
          ? response.responses.length
          : 0;
        const completed = !!response
          ? questionsCount === 0 || answeredCount >= questionsCount
          : false;

        return {
          ...this.normalizeActivityMedia(plain),
          completed,
          score: response?.score ?? null,
        };
      });

    return {
      activities,
      count: activities.length,
      schedule: {
        date: start,
        status: activities.length > 0 ? 'active' : 'no_activity',
      },
    };
  }

  /**
   * Historial del participante: todas las actividades que respondió o completó.
   *
   * Une las DOS fuentes reales de progreso del sistema:
   * - `UserResponse`: respuestas a preguntas (`POST /:id/:userId/submit`)
   * - `ActivityCompletion`: juegos (dado, caja de emociones, sopa de letras,
   *   conceptos), que se registran por otra vía y **no** crean UserResponse
   *
   * Devuelve cada actividad con su estado (`completada` | `en_progreso`),
   * puntaje, fecha de la última interacción y los conteos reales del historial.
   */
  async getMyHistory(
    userId: string,
    filters: { limit?: number } = {},
  ): Promise<{
    items: any[];
    counts: { total: number; completed: number; inProgress: number };
  }> {
    const { limit = 100 } = filters;
    const empty = { items: [], counts: { total: 0, completed: 0, inProgress: 0 } };

    const userObjectId = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : null;
    if (!userObjectId) return empty;

    // 1. Respuestas a preguntas
    const responses: any[] = await this.userResponseModel
      .find({ user: userObjectId })
      .select('activity score responses createdAt')
      .lean()
      .exec();

    // 2. Completaciones de juegos (se guardan contra el Participant)
    const participant: any = await this.participantModel
      .findOne({ userId: userObjectId })
      .select('_id')
      .lean()
      .exec();

    const completions: any[] = participant?._id
      ? await this.activityCompletionModel
          .find({ participant: participant._id })
          .select('activity achievedScore completedAt')
          .lean()
          .exec()
      : [];

    // 3. Unificar por actividad
    const merged = new Map<
      string,
      {
        answeredCount: number;
        score: number | null;
        completed: boolean;
        lastAt: Date;
      }
    >();

    for (const response of responses) {
      const key = String(response.activity);
      const answered = Array.isArray(response.responses)
        ? response.responses.length
        : 0;
      const prev = merged.get(key);
      const at = new Date(response.createdAt || 0);
      merged.set(key, {
        answeredCount: Math.max(prev?.answeredCount ?? 0, answered),
        score: Math.max(prev?.score ?? 0, Number(response.score) || 0) || null,
        completed: prev?.completed ?? false,
        lastAt: prev && prev.lastAt > at ? prev.lastAt : at,
      });
    }

    for (const completion of completions) {
      const key = String(completion.activity);
      const prev = merged.get(key);
      const at = new Date(completion.completedAt || 0);
      merged.set(key, {
        answeredCount: prev?.answeredCount ?? 0,
        score: Math.max(prev?.score ?? 0, Number(completion.achievedScore) || 0) || null,
        completed: true,
        lastAt: prev && prev.lastAt > at ? prev.lastAt : at,
      });
    }

    const ids = [...merged.keys()].filter((id) => Types.ObjectId.isValid(id));
    if (ids.length === 0) return empty;

    const activities = await this.activityModel
      // Sin `isActive`: el historial es el registro de lo que el participante
      // hizo. Si un administrador desactiva una actividad, no debe desaparecer
      // de su historial ni cambiar los totales que ya había visto
      // (informe del 4-nov-2026, hallazgo A-04).
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .populate('emotion')
      .exec();

    const counts = { total: 0, completed: 0, inProgress: 0 };

    const items = activities.map((doc: any) => {
      const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
      const entry = merged.get(String(plain._id))!;
      const questionsCount = Array.isArray(plain.questions)
        ? plain.questions.length
        : 0;

      // Completada si hay una completación de juego o si respondió todas las
      // preguntas (una actividad sin preguntas y con respuesta cuenta como hecha).
      const completed =
        entry.completed ||
        (questionsCount === 0 ? true : entry.answeredCount >= questionsCount);

      counts.total += 1;
      if (completed) counts.completed += 1;
      else counts.inProgress += 1;

      return {
        ...this.normalizeActivityMedia(plain),
        status: completed ? 'completada' : 'en_progreso',
        completed,
        answeredCount: entry.answeredCount,
        questionsCount,
        score: entry.score,
        lastActivityAt: entry.lastAt,
      };
    });

    items.sort(
      (a: any, b: any) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime(),
    );

    return { items: items.slice(0, limit), counts };
  }

  /**
   * Tablero de actividades del usuario para un tipo ('reto', 'evento_personal'…).
   *
   * A diferencia de `findAvailableByUser` (que excluye las ya respondidas),
   * devuelve **todas** las actividades activas del tipo con su estado:
   * - `pendiente`: sin ninguna respuesta
   * - `en_progreso`: respondió algunas preguntas pero no todas
   * - `completada`: respondió todas (o la actividad no tiene preguntas)
   *
   * Permite que la app muestre las tarjetas completadas con su insignia y
   * calcule "En Progreso" con datos reales, en una sola petición.
   */
  async getActivityBoard(
    userId: string,
    filters: { type?: string; limit?: number } = {},
  ): Promise<{
    activities: any[];
    counts: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
    };
  }> {
    const { type, limit = 100 } = filters;

    const query: any = { isActive: true };
    if (type) {
      // 'evento_personal' es el tipo por defecto del schema: incluye también
      // las actividades creadas antes de esta característica (sin `type`).
      if (type === 'evento_personal') {
        query.$or = [{ type: 'evento_personal' }, { type: { $exists: false } }];
      } else {
        query.type = type;
      }
    }

    const activities = await this.activityModel
      .find(query)
      .populate('emotion')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    const ids = activities.map((activity: any) => activity._id);
    const userObjectId = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : null;

    const responses =
      userObjectId && ids.length > 0
        ? await this.userResponseModel
            .find({ user: userObjectId, activity: { $in: ids } })
            .select('activity score responses')
            .lean()
            .exec()
        : [];

    const responsesByActivity = new Map<string, any>(
      responses.map((r: any) => [String(r.activity), r] as [string, any]),
    );

    const counts = { total: 0, pending: 0, inProgress: 0, completed: 0 };
    const order: Record<string, number> = {
      en_progreso: 0,
      pendiente: 1,
      completada: 2,
    };

    const board = activities.map((doc: any) => {
      const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
      const response = responsesByActivity.get(String(plain._id));

      const questionsCount = Array.isArray(plain.questions)
        ? plain.questions.length
        : 0;
      const answeredCount = Array.isArray(response?.responses)
        ? response.responses.length
        : 0;

      let status: 'pendiente' | 'en_progreso' | 'completada' = 'pendiente';
      if (response) {
        status =
          questionsCount === 0 || answeredCount >= questionsCount
            ? 'completada'
            : 'en_progreso';
      }

      counts.total += 1;
      if (status === 'completada') counts.completed += 1;
      else if (status === 'en_progreso') counts.inProgress += 1;
      else counts.pending += 1;

      return {
        ...this.normalizeActivityMedia(plain),
        status,
        completed: status === 'completada',
        inProgress: status === 'en_progreso',
        answeredCount,
        questionsCount,
        score: response?.score ?? null,
      };
    });

    // En progreso primero, luego pendientes, luego completadas.
    board.sort((a: any, b: any) => {
      const byStatus = order[a.status] - order[b.status];
      if (byStatus !== 0) return byStatus;
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return { activities: board, counts };
  }

  /**
   * Actividad del día (contrato legacy, un solo elemento).
   * Se mantiene por compatibilidad con clientes que aún consumen
   * `GET /api/activities/daily/current`; internamente usa el listado
   * ordenado de `getTodaysActivities`.
   */
  async getTodaysActivity(): Promise<any> {
    const { activities, schedule } = await this.getTodaysActivities(undefined, {
      limit: 1,
    });
    const activity = activities.length > 0 ? activities[0] : null;

    if (!activity) {
      this.logger.log(`No activity found for today`);
      return {
        activity: null,
        schedule: {
          date: schedule.date,
          status: 'no_activity',
        },
      };
    }

    return {
      activity,
      schedule: {
        date: activity.schedule?.date || schedule.date,
        status: 'active',
      },
    };
  }

  /**
   * Cobertura de Actividad Diaria por día.
   *
   * Cuenta las Actividades Diarias (`type: actividad_diaria`) activas
   * programadas en un rango (por defecto, la semana actual lunes-domingo en
   * Colombia). Las actividades sin fecha cubren todos los días del rango
   * porque quedan disponibles hasta completarse.
   */
  async getDailyActivityCoverage(
    filters: { from?: string; to?: string } = {},
  ): Promise<{
    from: string;
    to: string;
    days: { date: string; count: number; covered: boolean }[];
    summary: {
      totalDays: number;
      coveredDays: number;
      missingDays: number;
      percentage: number;
    };
    undatedCount: number;
  }> {
    const week = getColombiaWeekRange();
    const isIsoDate = (value?: string) =>
      !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

    const from = isIsoDate(filters.from) ? (filters.from as string) : week.from;
    const to = isIsoDate(filters.to) ? (filters.to as string) : week.to;
    const [startStr, endStr]: [string, string] =
      from <= to ? [from, to] : [to, from];

    const start = new Date(`${startStr}T00:00:00-05:00`);
    const end = new Date(`${endStr}T23:59:59.999-05:00`);
    const maxRangeMs = 31 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > maxRangeMs) {
      throw new BadRequestException('El rango no puede superar 31 días');
    }

    // Días del rango (YYYY-MM-DD)
    const days: { date: string; count: number; covered: boolean }[] = [];
    const cursor = new Date(`${startStr}T12:00:00Z`);
    const last = new Date(`${endStr}T12:00:00Z`);
    while (cursor.getTime() <= last.getTime()) {
      days.push({
        date: cursor.toISOString().slice(0, 10),
        count: 0,
        covered: false,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const dateKeys = days.map((day) => day.date);

    const rows = await this.activityModel
      .aggregate([
        {
          $match: {
            type: 'actividad_diaria',
            isActive: true,
            deleted: { $ne: true },
            'schedule.date': { $gte: start, $lte: end },
          },
        },
        {
          $project: {
            bogotaDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$schedule.date',
                timezone: 'America/Bogota',
              },
            },
            utcDate: {
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
            $or: [
              { bogotaDate: { $in: dateKeys } },
              { utcDate: { $in: dateKeys } },
            ],
          },
        },
        {
          $group: {
            _id: { bogota: '$bogotaDate', utc: '$utcDate' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = dateKeys.includes(row._id?.bogota)
        ? row._id.bogota
        : dateKeys.includes(row._id?.utc)
          ? row._id.utc
          : null;
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + row.count);
    }

    // Una Actividad Diaria sin fecha está disponible todos los días hasta
    // completarse, por lo que cubre el rango completo.
    const undatedCount = await this.activityModel
      .countDocuments({
        type: 'actividad_diaria',
        isActive: true,
        deleted: { $ne: true },
        $or: [
          { 'schedule.date': null },
          { 'schedule.date': { $exists: false } },
        ],
      })
      .exec();

    for (const day of days) {
      day.count = counts.get(day.date) ?? 0;
      day.covered = day.count > 0 || undatedCount > 0;
    }

    const coveredDays = days.filter((day) => day.covered).length;
    return {
      from: startStr,
      to: endStr,
      days,
      summary: {
        totalDays: days.length,
        coveredDays,
        missingDays: days.length - coveredDays,
        percentage: days.length
          ? Math.round((coveredDays / days.length) * 100)
          : 0,
      },
      undatedCount,
    };
  }

  /**
   * Cuenta actividades por fecha para un conjunto de días (YYYY-MM-DD).
   *
   * Devuelve un mapa `{ 'YYYY-MM-DD': count }` con las fechas solicitadas
   * que tengan al menos una actividad. Se usa en el listado para señalar
   * los días con varias actividades.
   */
  async countActivitiesByDates(
    dateStrs: string[],
  ): Promise<Record<string, number>> {
    const dates = Array.from(
      new Set((dateStrs || []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))),
    ).slice(0, 60);

    if (dates.length === 0) return {};

    // Rango indexable sobre schedule.date (se amplía un día por cada lado
    // para tolerar fechas guardadas en UTC o en hora Colombia).
    const sorted = [...dates].sort();
    const rangeStart = new Date(`${sorted[0]}T00:00:00-05:00`);
    rangeStart.setDate(rangeStart.getDate() - 1);
    const rangeEnd = new Date(`${sorted[sorted.length - 1]}T23:59:59.999-05:00`);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    const rows = await this.activityModel
      .aggregate([
        { $match: { 'schedule.date': { $gte: rangeStart, $lte: rangeEnd } } },
        {
          $project: {
            bogotaDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$schedule.date',
                timezone: 'America/Bogota',
              },
            },
            utcDate: {
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
            $or: [{ bogotaDate: { $in: dates } }, { utcDate: { $in: dates } }],
          },
        },
        {
          $group: {
            _id: { bogota: '$bogotaDate', utc: '$utcDate' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const counts: Record<string, number> = {};
    for (const row of rows) {
      // La clave de respuesta es la fecha solicitada que coincide, para que
      // el frontend pueda cruzarla con lo que muestra en pantalla.
      const key = dates.includes(row._id?.bogota)
        ? row._id.bogota
        : dates.includes(row._id?.utc)
          ? row._id.utc
          : null;
      if (!key) continue;
      counts[key] = (counts[key] || 0) + row.count;
    }

    return counts;
  }

  /**
   * Cuenta cuántas actividades están programadas para una fecha específica.
   *
   * @param dateStr - Fecha en formato YYYY-MM-DD (Colombia)
   * @param excludeId - ID de actividad a excluir (para edición)
   */
  async countActivitiesByDate(
    dateStr: string,
    excludeId?: string,
  ): Promise<number> {
    if (!dateStr) return 0;

    // Comparar contra America/Bogota y UTC para cubrir datos nuevos y antiguos
    return this.activityModel
      .countDocuments({
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        $or: [
          {
            $expr: {
              $eq: [
                {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$schedule.date',
                    timezone: 'America/Bogota',
                  },
                },
                dateStr,
              ],
            },
          },
          {
            $expr: {
              $eq: [
                {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$schedule.date',
                    timezone: 'UTC',
                  },
                },
                dateStr,
              ],
            },
          },
        ],
      })
      .exec();
  }

  /**
   * Verifica si ya existe al menos una actividad programada para una fecha.
   * @param dateStr - Fecha en formato YYYY-MM-DD (Colombia)
   * @param excludeId - ID de actividad a excluir (para edición)
   */
  async checkDateExists(dateStr: string, excludeId?: string): Promise<boolean> {
    return (await this.countActivitiesByDate(dateStr, excludeId)) > 0;
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

    // Soporta dos formatos de answers:
    //  - Array de {questionId, answer} para respuestas de preguntas.
    //  - Objeto de resultado de juego (score, timeSpent, wordsFound, etc.).
    const answersList = Array.isArray(responseDto.answers)
      ? (responseDto.answers as any[])
      : [];
    const gameResult =
      !Array.isArray(responseDto.answers) && responseDto.answers
        ? (responseDto.answers as Record<string, any>)
        : null;

    const results = answersList.map((answer) => {
      const question = activity.questions.find(
        (q: any) => q?.id.toString() == answer.questionId.toString(),
      );
      return {
        ...answer,
        isCorrect: question?.correctAnswer === answer.answer,
        points: question?.points || 0,
      };
    });

    // Una entrada por pregunta (o una entrada 'game' por resultado de juego).
    const incomingResponses = gameResult
      ? [
          {
            questionId: 'game',
            answer: JSON.stringify(gameResult),
            isCorrect: true,
            responseTime: Number(gameResult.timeSpent) || 10,
          },
        ]
      : answersList.map((answer) => ({
          questionId: answer.questionId,
          answer: answer.answer,
          isCorrect:
            results.find(
              (result) =>
                result?.questionId?.toString() === answer?.questionId?.toString(),
            )?.isCorrect || false,
          responseTime: 10,
        }));

    const userResponse = await this.userResponseModel
      .findOne({
        activity: new Types.ObjectId(activityId),
        user: new Types.ObjectId(userId),
      })
      .exec();

    // Se acumulan las respuestas: la actividad se responde pregunta a pregunta,
    // por lo que cada envío fusiona sus respuestas con las ya guardadas.
    const mergedResponses: any[] = [
      ...((userResponse?.responses as any[]) || []),
    ];
    incomingResponses.forEach((incoming) => {
      const index = mergedResponses.findIndex(
        (saved: any) =>
          saved?.questionId?.toString() === incoming.questionId.toString(),
      );
      if (index >= 0) {
        mergedResponses[index] = incoming;
      } else {
        mergedResponses.push(incoming);
      }
    });

    const totalScore = this.calculateResponseScore(activity, mergedResponses);

    if (userResponse) {
      userResponse.responses = mergedResponses;
      userResponse.score = totalScore;
      userResponse.endTime = new Date();
      await userResponse.save();
    } else {
      await this.userResponseModel.create({
        user: new Types.ObjectId(userId),
        activity: new Types.ObjectId(activityId),
        responses: mergedResponses,
        score: totalScore,
        startTime: new Date(),
        endTime: new Date(),
        timeSpent: gameResult ? Number(gameResult.timeSpent) || 10 : 10,
      });
    }

    // ─── Crear participante automáticamente si es su primera actividad ───
    try {
      const existingParticipant = await this.participantModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .exec();
      if (!existingParticipant) {
        await this.participantModel.create({
          userId: new Types.ObjectId(userId),
          nickname: `user-${userId.slice(-6)}`,
          points: 0,
          level: 'bronce',
          totalActivitiesCompleted: 0,
          isActive: true,
        });
        this.logger.log(
          `🎉 Nuevo participante creado para usuario ${userId} (primera actividad)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Error creating participant for ${userId}: ${err.message}`,
      );
    }

    return {
      activityId,
      userId,
      results,
      totalScore,
    };
  }

  /**
   * Calcula el puntaje acumulado de una respuesta a partir de sus entradas.
   * - Preguntas: suma los puntos de la pregunta cuando la respuesta es correcta.
   * - Juegos: usa el score reportado en el resultado del juego (entrada 'game').
   */
  private calculateResponseScore(activity: any, responses: any[]): number {
    return (responses || []).reduce((sum, item) => {
      if (!item) return sum;

      if (item.questionId === 'game') {
        try {
          return sum + (Number(JSON.parse(item.answer)?.score) || 0);
        } catch {
          return sum;
        }
      }

      if (!item.isCorrect) return sum;

      const question = activity?.questions?.find(
        (q: any) => q?.id?.toString() === item.questionId?.toString(),
      );
      return sum + (Number(question?.points) || 0);
    }, 0);
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
    const activityIds = userResponses
      .map((ur) => ur.activity?._id)
      .filter(Boolean);

    // Construir query para actividades
    const query: any = {
      _id: { $in: activityIds },
      isActive: true,
    };

    if (type) {
      // 'evento_personal' es el tipo por defecto del schema: incluye también
      // las actividades creadas antes de esta característica (sin campo type).
      if (type === 'evento_personal') {
        query.$or = [{ type: 'evento_personal' }, { type: { $exists: false } }];
      } else {
        query.type = type;
      }
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

  /**
   * Find activities available for a user (active and not yet responded),
   * optionally filtered by type. Se usa en las tabs de Retos y E-Personal
   * del mobile para mostrar actividades disponibles (no el historial).
   * @param userId - User ID
   * @param filters - Optional filters (type, page, limit)
   * @returns Paginated list of available activities for the user
   */
  async findAvailableByUser(
    userId: string,
    filters: { type?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: Activity[]; total: number; page: number; limit: number }> {
    const { type, page = 1, limit = 10 } = filters;

    // Actividades que el usuario ya respondió (se excluyen de las disponibles)
    const respondedIds = await this.userResponseModel
      .find({ user: new Types.ObjectId(userId) })
      .distinct('activity')
      .exec();

    const query: any = {
      isActive: true,
      _id: { $nin: respondedIds },
    };

    if (type) {
      // 'evento_personal' es el tipo por defecto del schema: incluye también
      // las actividades creadas antes de esta característica (sin campo type).
      if (type === 'evento_personal') {
        query.$or = [{ type: 'evento_personal' }, { type: { $exists: false } }];
      } else {
        query.type = type;
      }
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

  async search(searchTerm: string): Promise<Partial<Activity>[]> {
    if (!searchTerm || searchTerm === 'all') {
      return this.activityModel.find().limit(20).sort({ createdAt: -1 }).exec();
    }
    const regex = new RegExp(searchTerm, 'i');
    return this.activityModel
      .find({
        $or: [{ title: { $regex: regex } }, { description: { $regex: regex } }],
      })
      .limit(20)
      .sort({ createdAt: -1 })
      .exec();
  }
}
