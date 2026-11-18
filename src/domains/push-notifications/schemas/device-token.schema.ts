import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type DeviceTokenDocument = HydratedDocument<DeviceToken>;

@Schema({ collection: 'devicetokens', timestamps: true })
export class DeviceToken extends Document {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: ['ios', 'android', 'web'], default: 'android' })
  platform: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  deactivatedAt?: Date;

  @Prop({ type: String })
  deactivationReason?: string;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);

DeviceTokenSchema.index({ userId: 1 });
DeviceTokenSchema.index({ isActive: 1 });
// Consulta del envío dirigido: tokens activos de varios usuarios.
DeviceTokenSchema.index({ userId: 1, isActive: 1 });
// Salud de tokens: agrupación por plataforma y últimas desactivaciones.
DeviceTokenSchema.index({ isActive: 1, platform: 1 });
DeviceTokenSchema.index({ deactivatedAt: -1 });
