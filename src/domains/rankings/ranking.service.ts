import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Participant } from '../participant/schemas/participant.schema';

interface RankingEntry {
  userId: string;
  nickname: string;
  level: string;
  points: number;
  avatar?: string;
  rank?: number;
}

@Injectable()
@WebSocketGateway({ namespace: '/rankings' })
export class RankingService implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  /** Cache en memoria */
  private cachedRankings: RankingEntry[] = [];
  private lastCacheUpdate: Date | null = null;

  constructor(
    @InjectModel(Participant.name)
    private participantModel: Model<Participant>,
  ) {}

  async handleConnection(client: Socket) {
    const rankings = await this.getCachedRankings();
    client.emit('rankingsUpdate', rankings);
    client.emit('initialRankings', rankings);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateRankings() {
    const rankings = await this.calculateLeaderboard();
    this.cachedRankings = rankings;
    this.lastCacheUpdate = new Date();
    this.broadcastUpdate(rankings);
  }

  private async calculateLeaderboard(): Promise<RankingEntry[]> {
    const participants = await this.participantModel
      .find({ isActive: true })
      .select('userId nickname points level avatar')
      .sort({ points: -1 })
      .limit(100)
      .lean();

    return participants.map((p, index) => ({
      userId: typeof p.userId === 'object' ? p.userId.toString() : p.userId,
      nickname: p.nickname || 'participante',
      level: p.level || 'bronce',
      points: p.points || 0,
      avatar: p.avatar,
      rank: index + 1,
    }));
  }

  async getCachedRankings(): Promise<RankingEntry[]> {
    if (
      this.cachedRankings.length === 0 ||
      !this.lastCacheUpdate ||
      Date.now() - this.lastCacheUpdate.getTime() > 5 * 60 * 1000
    ) {
      const rankings = await this.calculateLeaderboard();
      this.cachedRankings = rankings;
      this.lastCacheUpdate = new Date();
    }
    return this.cachedRankings;
  }

  broadcastUpdate(rankings: RankingEntry[]) {
    this.server.emit('rankingsUpdate', rankings);
  }

  @SubscribeMessage('joinRankingRoom')
  async handleJoinRoom(client: Socket) {
    const rankings = await this.getCachedRankings();
    client.emit('rankingsUpdate', rankings);
  }

  @SubscribeMessage('requestUserPosition')
  async handleUserPositionRequest(client: Socket, userId: string) {
    const rankings = await this.getCachedRankings();
    const position = rankings.findIndex((r) => r.userId === userId) + 1;
    client.emit('userPosition', position > 0 ? position : rankings.length + 1);
  }

  @SubscribeMessage('requestFullLeaderboard')
  async handleFullLeaderboardRequest(client: Socket) {
    const rankings = await this.getCachedRankings();
    client.emit('fullLeaderboard', rankings);
  }

  async getLiveRankings() {
    return this.getCachedRankings();
  }

  async getHistoricalRankings(days: number = 7): Promise<any[]> {
    return [];
  }
}
