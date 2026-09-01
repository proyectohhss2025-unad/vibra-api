import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CronJobExecutionDocument = CronJobExecution & Document;

@Schema({ timestamps: true, collection: 'cronjob-executions' })
export class CronJobExecution {
  _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  jobId: Types.ObjectId;

  @Prop({ required: true })
  jobType: string;

  @Prop({ required: true })
  jobName: string;

  @Prop({ required: true })
  startedAt: Date;

  @Prop({ default: null })
  completedAt: Date;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ required: true, enum: ['success', 'error', 'running'] })
  result: string;

  @Prop({ default: '' })
  errorMessage: string;

  @Prop({ default: 'scheduler', enum: ['scheduler', 'manual', 'retry'] })
  triggeredBy: string;

  @Prop({ type: Object, default: {} })
  output: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const CronJobExecutionSchema =
  SchemaFactory.createForClass(CronJobExecution);

CronJobExecutionSchema.index({ jobId: 1, startedAt: -1 });
CronJobExecutionSchema.index({ jobType: 1, result: 1 });
