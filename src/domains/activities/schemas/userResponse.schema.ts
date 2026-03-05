import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Activity } from './activity.schema';

@Schema()
export class UserResponse extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    user: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Activity' })
    activity: Activity;

    @Prop([{
        questionId: { type: MongooseSchema.Types.ObjectId },
        answer: String,
        isCorrect: Boolean,
        responseTime: Number
    }])
    responses: {
        questionId: MongooseSchema.Types.ObjectId;
        answer: string;
        isCorrect: boolean;
        responseTime: number;
    }[];

    @Prop({ index: true })
    score: number;

    @Prop()
    startTime: Date;

    @Prop()
    endTime: Date;

    @Prop({ type: Number, virtual: true })
    timeSpent: number;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);