import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactStatus = 'unread' | 'read' | 'in_progress' | 'resolved' | 'spam';

@Schema({ timestamps: true })
export class Contact extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    type: String,
    enum: ['unread', 'read', 'in_progress', 'resolved', 'spam'],
    default: 'unread',
  })
  status: ContactStatus;

  @Prop({ type: String, default: '' })
  notes: string;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  @Prop({ type: Date, default: null })
  resolvedAt: Date | null;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
