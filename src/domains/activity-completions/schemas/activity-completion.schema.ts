import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ActivityCompletion extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Participant', required: true, index: true })
  participant: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Activity', required: true, index: true })
  activity: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  plannedScore: number;

  @Prop({ required: true, min: 0 })
  achievedScore: number;

  @Prop({ type: Number, default: null })
  timeSpent?: number;

  @Prop([{
    _id: false,
    type: { type: String, enum: ['WordSearch', 'MatchingConcepts', 'DiceGame', 'EmotionBox'] },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
  }])
  gamesCompleted: Array<{
    type: string;
    score: number;
    maxScore: number;
  }>;

  @Prop({ default: Date.now })
  completedAt: Date;
}

export const ActivityCompletionSchema = SchemaFactory.createForClass(ActivityCompletion);

ActivityCompletionSchema.index({ participant: 1, completedAt: -1 });
ActivityCompletionSchema.index({ achievedScore: -1 });
