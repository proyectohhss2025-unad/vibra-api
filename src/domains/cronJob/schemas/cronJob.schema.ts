import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CronJobDocument = CronJob & Document;

@Schema({ timestamps: true, collection: 'cronjobs' })
export class CronJob {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  jobType: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  expression: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: 'idle', enum: ['idle', 'running', 'paused', 'error'] })
  status: string;

  @Prop({ default: null })
  lastRunAt: Date;

  @Prop({ default: null, enum: [null, 'success', 'error'] })
  lastResult: string;

  @Prop({ default: '' })
  lastErrorMessage: string;

  @Prop({ default: 0 })
  lastDuration: number;

  @Prop({ default: null })
  nextRunAt: Date;

  @Prop({ type: Object, default: {} })
  config: Record<string, any>;

  @Prop({ default: false })
  retryOnFailure: boolean;

  @Prop({ default: 0 })
  maxRetries: number;

  @Prop({ default: false })
  notifyOnError: boolean;

  @Prop({ default: false })
  notifyOnSuccess: boolean;

  @Prop({ default: null })
  deletedAt: Date;

  @Prop({ default: null })
  deletedBy: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CronJobSchema = SchemaFactory.createForClass(CronJob);

// Índice único para jobType (evitar duplicados del mismo tipo)
CronJobSchema.index({ jobType: 1 }, { unique: true, sparse: true });

// Índice compuesto para consultas frecuentes
CronJobSchema.index({ active: 1, deletedAt: 1 });
CronJobSchema.index({ status: 1, deletedAt: 1 });
