import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type CourseDocument = HydratedDocument<Course>;

@Schema({ timestamps: true })
export class Course extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String, required: true })
  companyId: string;

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  @Prop({ type: Boolean, default: true })
  status: boolean;

  @Prop({ type: String })
  instructorId: string;

  @Prop({ type: Number })
  maxStudents: number;

  @Prop({ type: String })
  category: string;

  @Prop({ type: Boolean, default: false })
  deleted?: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: String })
  deletedBy?: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

// Índices para optimizar consultas
CourseSchema.index({ companyId: 1 });
CourseSchema.index({ instructorId: 1 });
CourseSchema.index({ status: 1 });
CourseSchema.index({ category: 1 });
