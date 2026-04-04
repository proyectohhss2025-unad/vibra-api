import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: String })
  ID: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: Boolean })
  isRead?: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;

  /*@Prop({ type: Types.ObjectId, ref: 'Participant' })
  participant?: Types.ObjectId;*/

  @Prop({ type: Types.ObjectId, ref: 'NotificationType' })
  notificationType: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'NotificationChannel' })
  notificationChannel: Types.ObjectId;

  @Prop({ type: Number })
  priority: number;

  @Prop({ type: String })
  serial?: string;

  @Prop({ type: Boolean, default: true })
  isActive?: boolean;

  @Prop({ type: Boolean, default: false })
  deleted?: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: String })
  deletedBy?: string;

  @Prop({ type: Date })
  editedAt?: Date;

  @Prop({ type: String })
  editedBy?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: String })
  createdBy: string;

  @Prop({ type: String })
  event?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
