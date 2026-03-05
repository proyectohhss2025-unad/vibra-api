import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
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
}

export const EmotionSchema = SchemaFactory.createForClass(Emotion);