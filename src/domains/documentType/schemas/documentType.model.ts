import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DocumentType extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String })
  serial: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop({ type: String })
  deletedBy: string;

  @Prop({ type: Date })
  editedAt: Date;

  @Prop({ type: String })
  editedBy: string;

  @Prop({ type: String })
  createdBy: string;
}

export const DocumentTypeSchema = SchemaFactory.createForClass(DocumentType);

