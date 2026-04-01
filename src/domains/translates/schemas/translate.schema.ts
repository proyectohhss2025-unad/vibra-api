import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TranslateDocument = Translate & Document;

@Schema({ timestamps: true })
export class Translate {
  @Prop({ required: true })
  language: string;

  @Prop({ type: Object, required: true })
  translations: Record<string, string>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  deletedBy?: string;
}

export const TranslateSchema = SchemaFactory.createForClass(Translate);
