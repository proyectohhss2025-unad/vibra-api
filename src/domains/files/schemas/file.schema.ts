import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type FileDocument = HydratedDocument<File>;

@Schema({ timestamps: true })
export class File extends Document {
  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, required: true })
  fileType: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  url: string;

  @Prop({ type: String })
  size: string;

  @Prop({ type: String })
  invoiceId: string;

  @Prop({ type: String })
  crossingWithInvoiceLoadId?: string;

  @Prop({ type: String })
  accountsReceivableId?: string;

  @Prop({ type: String })
  creditNoteId?: string;

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

export const FileSchema = SchemaFactory.createForClass(File);
