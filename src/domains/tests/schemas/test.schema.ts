import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TestDocument = HydratedDocument<Test>;

@Schema()
export class TestQuestion {
  @Prop({ required: true })
  questionId: string;

  @Prop({ required: true, enum: ['open', 'single', 'multiple'] })
  type: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: [String], default: [] })
  options?: string[];

  @Prop({ default: 1 })
  points?: number;

  @Prop({ default: true })
  required?: boolean;
}

@Schema({ timestamps: true })
export class Test {
  @Prop({ required: true, unique: true })
  testId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  category?: string;

  @Prop({ default: 1, min: 1, max: 5 })
  difficulty?: number;

  @Prop()
  timeLimit?: number;

  @Prop()
  passingScore?: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [TestQuestion], required: true, validate: (v: any[]) => v.length > 0 })
  questions: TestQuestion[];

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ default: 1 })
  version?: number;

  @Prop()
  createdBy?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TestSchema = SchemaFactory.createForClass(Test);

TestSchema.index({ testId: 1 }, { unique: true });
TestSchema.index({ title: 'text', description: 'text' });
