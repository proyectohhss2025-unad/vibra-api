import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class WeeklySchedule extends Document {
    @Prop({ required: true })
    weekNumber: number;

    @Prop({ required: true })
    year: number;

    @Prop([{
        date: { type: Date, required: true },
        emotion: { type: String, required: true },
        activity: { type: MongooseSchema.Types.ObjectId, ref: 'Activity', required: true },
        status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' }
    }])
    days: {
        date: Date;
        emotion: string;
        activity: string;
        status: string;
    }[];

    @Prop([{ type: MongooseSchema.Types.ObjectId, ref: 'User' }])
    participants: string[];
}

export const WeeklyScheduleSchema = SchemaFactory.createForClass(WeeklySchedule);
