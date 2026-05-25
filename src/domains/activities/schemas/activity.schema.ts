import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Emotion } from 'src/domains/emotions/schemas/emotion.schema';

@Schema()
export class Activity extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Emotion',
    required: true,
    index: true,
  })
  emotion: Types.ObjectId | Emotion;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({
    type: [
      {
        type: { type: String, enum: ['video', 'audio'] },
        url: String,
        duration: Number,
        metadata: Object,
      },
    ],
    _id: false,
  })
  resources: Types.Array<{
    type: 'video' | 'audio';
    url: string;
    duration?: number;
    metadata?: Record<string, any>;
  }>;

  @Prop({
    type: [
      {
        id: String,
        questionText: String,
        type: { type: String, enum: ['multiple', 'open'] },
        options: [String],
        correctAnswer: String,
        points: Number,
      },
    ],
    _id: false,
  })
  questions: Types.Array<{
    id: string;
    questionText: string;
    type: 'multiple' | 'open';
    options?: string[];
    correctAnswer?: string;
    points: number;
  }>;

  @Prop({ min: 1, max: 5, default: 3 })
  difficulty: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: String,
    enum: ['reto', 'evento_personal', 'actividad_pares', 'otro'],
    default: 'evento_personal',
    index: true,
  })
  type?: string;

  @Prop({
    type: [{
      _id: false,
      emoji: { type: String, required: true },
      message: { type: String, required: true },
      category: {
        type: String,
        enum: ['start', 'question', 'wordsearch', 'matching', 'emotionbox', 'dicegame', 'complete', null],
        default: null,
      },
    }],
    default: [],
  })
  tips: { emoji: string; message: string; category?: string }[];

  @Prop({
    type: [{
      _id: false,
      type: {
        type: String,
        enum: ['WordSearch', 'MatchingConcepts', 'DiceGame', 'EmotionBox'],
        required: true,
      },
      config: { type: MongooseSchema.Types.Mixed, required: true },
      order: { type: Number, default: 0 },
    }],
    default: [],
  })
  games: Array<{
    type: 'WordSearch' | 'MatchingConcepts' | 'DiceGame' | 'EmotionBox';
    config: Record<string, any>;
    order: number;
  }>;

  @Prop({
    type: {
      _id: false,
      date: Date,
      weekNumber: Number,
      year: Number,
    },
  })
  schedule: {
    date: Date;
    weekNumber: number;
    year: number;
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Índices para optimizar consultas
ActivitySchema.index({ type: 1 });
ActivitySchema.index({ isActive: 1 });
ActivitySchema.index({ 'schedule.date': 1 });
