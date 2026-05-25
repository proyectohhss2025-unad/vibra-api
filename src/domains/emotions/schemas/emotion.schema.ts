import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Emotion extends Document {
  @Prop({ unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  orientationNote: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  icono: string;

  @Prop({ required: true, default: 0 })
  percentNote: number;

  @Prop({ enum: ['Positiva', 'Negativa', 'Neutra', 'Basica', 'Compleja'] })
  category?: string;

  @Prop({ min: 1, max: 10 })
  intensity?: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const EmotionSchema = SchemaFactory.createForClass(Emotion);
