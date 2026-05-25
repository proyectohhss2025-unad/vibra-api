import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PolicyDocument = Document & Policy;

@Schema({ timestamps: true, strict: false })
export class Policy {
  @Prop({ required: true })
  title: string;

  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop()
  category: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  type: string;

  @Prop()
  version: string;

  @Prop({ default: Date.now })
  effectiveDate: Date;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);
