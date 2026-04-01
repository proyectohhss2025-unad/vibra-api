import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CronJobDocument = CronJob & Document;

@Schema()
export class CronJob {
  @Prop({ required: true })
  expression: string;

  @Prop({ required: true })
  jobType: string;

  @Prop({ required: true })
  active: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CronJobSchema = SchemaFactory.createForClass(CronJob);
