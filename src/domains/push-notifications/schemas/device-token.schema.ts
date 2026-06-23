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
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);

DeviceTokenSchema.index({ userId: 1 });
DeviceTokenSchema.index({ isActive: 1 });
