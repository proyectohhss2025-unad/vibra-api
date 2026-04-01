import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ConfigDocument = HydratedDocument<Config>;

@Schema({ timestamps: true })
export class Config extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: String })
  description: string;

  @Prop({ required: true })
  flag: boolean;

  @Prop({ type: [String] })
  allowedUsers: string[];

  @Prop({ type: [String] })
  disallowedUsers: string[];

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

export const ConfigSchema = SchemaFactory.createForClass(Config);
