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
import { Redis } from 'ioredis';
import { UserResponse } from '../userResponses/schemas/userResponse.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
@WebSocketGateway({ namespace: '/rankings' })
export class RankingService implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private redisClient: Redis;

  constructor(
    @InjectModel(UserResponse.name) private responseModel: Model<UserResponse>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    /*this.redisClient = new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT)
        });*/
  }

  async handleConnection(client: Socket) {
    const initialRankings = await this.getCachedRankings();
    //client.emit('initialRankings', initialRankings);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateRankings() {
    const rankings = await this.calculateDailyRankings();
    await this.cacheRankings(rankings);
    this.broadcastUpdate(rankings);
  }

  private async calculateDailyRankings() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const responses = await this.responseModel
      .find({ createdAt: { $gte: startOfDay } })
      .populate('user', 'username avatar')
      .lean();

    const userScores = new Map<string, number>();

    responses.forEach((response: any) => {
      const score = this.calculateScore(response);
      const current = userScores.get(response.user._id.toString()) || 0;
      userScores.set(response.user._id.toString(), current + score);
    });

    const sortedRankings = Array.from(userScores.entries())
      .map(([userId, score]) => ({
        userId,
        score,
        username: responses.find((r) => r.user._id.toString() === userId)?.user[
          'username'
        ],
        avatar: responses.find((r) => r.user._id.toString() === userId)?.user[
          'avatar'
        ],
      }))
      .sort((a, b) => b.score - a.score);

    return sortedRankings;
  }

  private calculateScore(response: UserResponse): number {
    const baseScore = response.responses.reduce(
      (acc, curr) => acc + (curr.isCorrect ? 100 : 0),
      0,
    );

    const timeBonus = Math.max(0, 300 - response.timeSpent) * 0.1;
    const completenessBonus = response.responses.length === 5 ? 50 : 0;

    return baseScore + timeBonus + completenessBonus;
  }

  private async cacheRankings(rankings: any[]) {
    await this.redisClient.set(
      'dailyRankings',
      JSON.stringify(rankings),
      'EX',
      60 * 60 * 24, // 24 horas
    );
  }

  async getCachedRankings() {
    const cached = await this.redisClient.get('dailyRankings');
    return cached ? JSON.parse(cached) : [];
  }

  async getHistoricalRankings(days: number = 7) {
    return this.redisClient.zrevrange(
      'historicalRankings',
      0,
      days,
      'WITHSCORES',
    );
  }

  broadcastUpdate(rankings: any[]) {
    this.server.emit('rankingsUpdate', rankings);
  }

  @SubscribeMessage('requestUserPosition')
  async handleUserPositionRequest(client: Socket, userId: string) {
    const rankings = await this.getCachedRankings();
    const position = rankings.findIndex((r) => r.userId === userId) + 1;
    client.emit('userPosition', position);
  }

  @SubscribeMessage('requestFullLeaderboard')
  async handleFullLeaderboardRequest(client: Socket) {
    const rankings = await this.getCachedRankings();
    client.emit('fullLeaderboard', rankings);
  }

  // Para propósitos de desarrollo/testing
  async simulateScoreUpdate(userId: string, scoreDelta: number) {
    const currentRankings = await this.getCachedRankings();
    const userIndex = currentRankings.findIndex((r) => r.userId === userId);

    if (userIndex > -1) {
      currentRankings[userIndex].score += scoreDelta;
      currentRankings.sort((a, b) => b.score - a.score);
      await this.cacheRankings(currentRankings);
      this.broadcastUpdate(currentRankings);
    }
  }

  async getLiveRankings() {
    return this.getCachedRankings();
  }
}
