import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CronJobExecution,
  CronJobExecutionDocument,
} from './schemas/cronJobExecution.schema';

@Injectable()
export class CronJobExecutionService {
  private readonly logger = new Logger(CronJobExecutionService.name);

  constructor(
    @InjectModel(CronJobExecution.name)
    private executionModel: Model<CronJobExecutionDocument>,
  ) {}

  /**
   * Registra el inicio de una ejecución.
   */
  async startExecution(
    jobId: Types.ObjectId,
    jobType: string,
    jobName: string,
    triggeredBy: 'scheduler' | 'manual' | 'retry' = 'scheduler',
  ): Promise<CronJobExecutionDocument> {
    return this.executionModel.create({
      jobId,
      jobType,
      jobName,
      startedAt: new Date(),
      result: 'running',
      triggeredBy,
    });
  }

  /**
   * Marca una ejecución como completada exitosamente.
   */
  async completeExecution(
    executionId: Types.ObjectId,
    output?: Record<string, any>,
  ): Promise<void> {
    const now = new Date();
    const execution = await this.executionModel.findById(executionId);
    if (!execution) return;

    const startedAt = execution.startedAt.getTime();
    const duration = now.getTime() - startedAt;

    await this.executionModel.findByIdAndUpdate(executionId, {
      $set: {
        completedAt: now,
        duration,
        result: 'success',
        output: output || {},
      },
    });
  }

  /**
   * Marca una ejecución como fallida.
   */
  async failExecution(
    executionId: Types.ObjectId,
    errorMessage: string,
    output?: Record<string, any>,
  ): Promise<void> {
    const now = new Date();
    const execution = await this.executionModel.findById(executionId);
    if (!execution) return;

    const startedAt = execution.startedAt.getTime();
    const duration = now.getTime() - startedAt;

    await this.executionModel.findByIdAndUpdate(executionId, {
      $set: {
        completedAt: now,
        duration,
        result: 'error',
        errorMessage: errorMessage.substring(0, 2000),
        output: output || {},
      },
    });
  }

  /**
   * Obtiene el historial de ejecuciones de un job.
   */
  async getHistory(
    jobId: Types.ObjectId,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.executionModel
        .find({ jobId })
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.executionModel.countDocuments({ jobId }),
    ]);
    return { docs, total, page, limit };
  }

  /**
   * Obtiene el resumen de ejecuciones recientes para todos los jobs.
   */
  async getLastExecutionForJobs(jobIds: Types.ObjectId[]): Promise<Map<string, CronJobExecutionDocument>> {
    const map = new Map<string, CronJobExecutionDocument>();
    for (const jobId of jobIds) {
      const last = await this.executionModel
        .findOne({ jobId })
        .sort({ startedAt: -1 })
        .lean()
        .exec();
      if (last) {
        map.set(jobId.toString(), last as any);
      }
    }
    return map;
  }

  /**
   * Limpia historial de ejecuciones anteriores a una fecha.
   */
  async cleanHistory(beforeDate: Date): Promise<number> {
    const result = await this.executionModel.deleteMany({
      startedAt: { $lt: beforeDate },
    });
    return result.deletedCount;
  }
}
