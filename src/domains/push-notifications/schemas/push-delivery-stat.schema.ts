import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Registro histórico de una ejecución de envío push.
 * Permite calcular tendencias de entregas, fallos y tokens desactivados.
 */
@Schema({ collection: 'pushdeliverystats', timestamps: true })
export class PushDeliveryStat extends Document {
  @Prop({ required: true })
  jobType: string;

  @Prop({ type: String })
  event?: string;

  @Prop({ default: 'job' })
  source: string;

  @Prop({ default: 0 })
  sent: number;

  @Prop({ default: 0 })
  failed: number;

  @Prop({ default: 0 })
  deactivated: number;

  @Prop({ default: 0 })
  skipped: number;

  @Prop({ default: 0 })
  tokens: number;

  @Prop({ default: 0 })
  users: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const PushDeliveryStatSchema =
  SchemaFactory.createForClass(PushDeliveryStat);

PushDeliveryStatSchema.index({ createdAt: -1 });
PushDeliveryStatSchema.index({ jobType: 1, createdAt: -1 });
