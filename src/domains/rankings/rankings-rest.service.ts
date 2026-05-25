import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Participant } from '../participant/schemas/participant.schema';
import { User } from '../users/schemas/user.schema';
import { RankingQueryDto } from './dto/ranking-query.dto';
import { RankingResponseDto, RankingItemDto } from './dto/ranking-response.dto';

@Injectable()
export class RankingsRestService {
  private readonly logger = new Logger(RankingsRestService.name);
  private readonly CACHE_TTL = 30_000; // 30 segundos
  private cache = new Map<string, { data: RankingResponseDto; timestamp: number }>();

  constructor(
    @InjectModel(Participant.name)
    private participantModel: Model<Participant>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  private getCacheKey(scope: string, scopeId: string | null, limit: number, offset: number): string {
    return `${scope}:${scopeId || 'null'}:${limit}:${offset}`;
  }

  private getFromCache(key: string): RankingResponseDto | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: RankingResponseDto): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.CACHE_TTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  private buildFilter(extraFilter: Record<string, any> = {}, search?: string): any {
    const filter: any = { isActive: true, ...extraFilter };
    if (search) {
      filter.nickname = { $regex: search, $options: 'i' };
    }
    return filter;
  }

  private async enrichParticipants(
    participants: any[],
    offset: number,
  ): Promise<RankingItemDto[]> {
    // Extraer userIds únicos y courseIds
    const userIds = participants
      .map((p) => p.userId)
      .filter((id) => id != null)
      .map((id) => (typeof id === 'object' ? id.toString() : id));

    const courseIds = participants
      .map((p) => p.currentCourse)
      .filter((id) => id != null)
      .map((id) => (typeof id === 'object' ? id.toString() : id));

    // Obtener nombres de usuarios (para institución)
    const users = userIds.length > 0
      ? await this.userModel
          .find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
          .populate({ path: 'company', select: 'name' })
          .select('company')
          .lean()
      : [];

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    // Obtener nombres de cursos
    const CourseModel = this.participantModel.db.model('Course');
    const courses = courseIds.length > 0
      ? await CourseModel
          .find({ _id: { $in: courseIds.map((id) => new Types.ObjectId(id)) } })
          .select('name')
          .lean()
      : [];

    const courseMap = new Map(courses.map((c: any) => [c._id.toString(), c]));

    return participants.map((p, index) => {
      const pid = p._id?.toString() || '';
      const uid = p.userId?.toString() || '';
      const cid = p.currentCourse?.toString() || '';
      const user = userMap.get(uid) as any;
      const course = courseMap.get(cid) as any;
      const company = user?.company as any;

      return {
        position: offset + index + 1,
        userId: uid,
        nickname: p.nickname || 'participante',
        avatar: p.avatar,
        points: p.points || 0,
        level: p.level || 'bronce',
        courseName: course?.name || undefined,
        institutionName: company?.name || undefined,
      };
    });
  }

  /**
   * Ranking general: todos los participantes activos ordenados por puntos.
   */
  async getGeneral(query: RankingQueryDto): Promise<RankingResponseDto> {
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const cacheKey = this.getCacheKey('general', null, limit, offset);

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const filter = this.buildFilter({}, query.search);

    const [participants, total] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort({ points: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.participantModel.countDocuments(filter),
    ]);

    const data = await this.enrichParticipants(participants, offset);

    const response: RankingResponseDto = { data, total, scope: 'general', scopeId: null };
    this.setCache(cacheKey, response);
    return response;
  }

  /**
   * Ranking por curso: participantes de un curso específico.
   */
  async getByCourse(courseId: string, query: RankingQueryDto): Promise<RankingResponseDto> {
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const cacheKey = this.getCacheKey('course', courseId, limit, offset);

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!Types.ObjectId.isValid(courseId)) {
      return { data: [], total: 0, scope: 'course', scopeId: courseId };
    }

    const filter = this.buildFilter(
      { currentCourse: new Types.ObjectId(courseId) },
      query.search,
    );

    const [participants, total] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort({ points: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.participantModel.countDocuments(filter),
    ]);

    const data = await this.enrichParticipants(participants, offset);

    const response: RankingResponseDto = { data, total, scope: 'course', scopeId: courseId };
    this.setCache(cacheKey, response);
    return response;
  }

  /**
   * Ranking por institución: participantes de una institución (company).
   */
  async getByInstitution(institutionId: string, query: RankingQueryDto): Promise<RankingResponseDto> {
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const cacheKey = this.getCacheKey('institution', institutionId, limit, offset);

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!Types.ObjectId.isValid(institutionId)) {
      return { data: [], total: 0, scope: 'institution', scopeId: institutionId };
    }

    // Buscar users que pertenezcan a esta institución
    const institutionUsers = await this.userModel
      .find({ company: new Types.ObjectId(institutionId) })
      .select('_id')
      .lean();

    const userIds = institutionUsers.map((u) => u._id);

    if (userIds.length === 0) {
      return { data: [], total: 0, scope: 'institution', scopeId: institutionId };
    }

    const filter = this.buildFilter(
      { userId: { $in: userIds } },
      query.search,
    );

    const [participants, total] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort({ points: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.participantModel.countDocuments(filter),
    ]);

    const data = await this.enrichParticipants(participants, offset);

    const response: RankingResponseDto = { data, total, scope: 'institution', scopeId: institutionId };
    this.setCache(cacheKey, response);
    return response;
  }
}
