import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PushSendResult } from './push-notifications.service';
import { PushDeliveryStat } from './schemas/push-delivery-stat.schema';

export interface PushDeliveryStatRecordInput {
  jobType: string;
  event?: string;
  source?: string;
  result: PushSendResult;
  metadata?: Record<string, any>;
}

export interface PushDeliveryTrendPoint {
  weekStart: Date | string;
  sent: number;
  failed: number;
  deactivated: number;
  skipped: number;
  tokens: number;
  users: number;
  runs: number;
}

export interface PushDeliverySummary {
  sent: number;
  failed: number;
  deactivated: number;
  skipped: number;
  tokens: number;
  users: number;
  runs: number;
  failureRate: number;
  deactivationRate: number;
}

export interface PushDeliveryLastRun {
  jobType: string;
  event?: string;
  source: string;
  sent: number;
  failed: number;
  deactivated: number;
  skipped: number;
  tokens: number;
  users: number;
  createdAt: Date | string;
}

export interface PushDeliveryStatsResult {
  weeks: number;
  summary: PushDeliverySummary;
  trend: PushDeliveryTrendPoint[];
  lastRun: PushDeliveryLastRun | null;
}

const emptySummary = (): PushDeliverySummary => ({
  sent: 0,
  failed: 0,
  deactivated: 0,
  skipped: 0,
  tokens: 0,
  users: 0,
  runs: 0,
  failureRate: 0,
  deactivationRate: 0,
});

const roundRate = (value: number): number =>
  Math.round(value * 10) / 10;

@Injectable()
export class PushDeliveryStatsService {
  private cache: { data: PushDeliveryStatsResult; at: number } | null = null;
  private readonly cacheMs = 60_000;

  constructor(
    @InjectModel(PushDeliveryStat.name)
    private readonly statModel: Model<PushDeliveryStat>,
  ) {}

  /**
   * Persiste el resultado de una ejecución de push. Invalida la caché de
   * tendencias para que el dashboard refleje el nuevo punto.
   */
  async record(input: PushDeliveryStatRecordInput): Promise<PushDeliveryStat> {
    const { result } = input;

    const created = await this.statModel.create({
      jobType: input.jobType,
      event: input.event,
      source: input.source || 'job',
      sent: result.sent,
      failed: result.failed,
      deactivated: result.deactivated,
      skipped: result.skipped,
      tokens: result.tokens,
      users: result.users,
      metadata: input.metadata,
    });

    this.cache = null;
    return created;
  }

  /**
   * Tendencia semanal + resumen + última ejecución.
   * Ventana entre 1 y 52 semanas; caché de 60s.
   */
  async getStats(
    options: { weeks?: number; force?: boolean } = {},
  ): Promise<PushDeliveryStatsResult> {
    const weeks = Math.min(
      52,
      Math.max(1, Math.trunc(options.weeks || 8)),
    );

    if (
      !options.force &&
      this.cache &&
      Date.now() - this.cache.at < this.cacheMs
    ) {
      return this.cache.data;
    }

    const start = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);

    const [facet] = await this.statModel
      .aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $facet: {
            trend: [
              {
                $group: {
                  _id: {
                    $dateTrunc: {
                      date: '$createdAt',
                      unit: 'week',
                      timezone: 'America/Bogota',
                    },
                  },
                  sent: { $sum: '$sent' },
                  failed: { $sum: '$failed' },
                  deactivated: { $sum: '$deactivated' },
                  skipped: { $sum: '$skipped' },
                  tokens: { $sum: '$tokens' },
                  users: { $sum: '$users' },
                  runs: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
              {
                $project: {
                  _id: 0,
                  weekStart: '$_id',
                  sent: 1,
                  failed: 1,
                  deactivated: 1,
                  skipped: 1,
                  tokens: 1,
                  users: 1,
                  runs: 1,
                },
              },
            ],
            summary: [
              {
                $group: {
                  _id: null,
                  sent: { $sum: '$sent' },
                  failed: { $sum: '$failed' },
                  deactivated: { $sum: '$deactivated' },
                  skipped: { $sum: '$skipped' },
                  tokens: { $sum: '$tokens' },
                  users: { $sum: '$users' },
                  runs: { $sum: 1 },
                },
              },
              { $project: { _id: 0 } },
            ],
            lastRun: [
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              {
                $project: {
                  _id: 0,
                  jobType: 1,
                  event: 1,
                  source: 1,
                  sent: 1,
                  failed: 1,
                  deactivated: 1,
                  skipped: 1,
                  tokens: 1,
                  users: 1,
                  createdAt: 1,
                },
              },
            ],
          },
        },
      ])
      .exec();

    const trend: PushDeliveryTrendPoint[] = (
      (facet?.trend || []) as any[]
    ).map((row) => ({
      weekStart: row.weekStart,
      sent: row.sent || 0,
      failed: row.failed || 0,
      deactivated: row.deactivated || 0,
      skipped: row.skipped || 0,
      tokens: row.tokens || 0,
      users: row.users || 0,
      runs: row.runs || 0,
    }));

    const rawSummary = facet?.summary?.[0] || {};
    const attempts =
      (rawSummary.sent || 0) + (rawSummary.failed || 0);

    const summary: PushDeliverySummary = {
      sent: rawSummary.sent || 0,
      failed: rawSummary.failed || 0,
      deactivated: rawSummary.deactivated || 0,
      skipped: rawSummary.skipped || 0,
      tokens: rawSummary.tokens || 0,
      users: rawSummary.users || 0,
      runs: rawSummary.runs || 0,
      failureRate: attempts
        ? roundRate(((rawSummary.failed || 0) / attempts) * 100)
        : 0,
      deactivationRate: attempts
        ? roundRate(((rawSummary.deactivated || 0) / attempts) * 100)
        : 0,
    };

    const data: PushDeliveryStatsResult = {
      weeks,
      summary: summary.runs ? summary : emptySummary(),
      trend,
      lastRun: (facet?.lastRun?.[0] as PushDeliveryLastRun) || null,
    };

    this.cache = { data, at: Date.now() };
    return data;
  }
}
