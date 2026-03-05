import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Rank extends Document {

    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'UserEmotion' })
    userEmotion: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'UserChallenge' })
    userChallenge: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'UserPersonalEvent' })
    userPersonalEvent: string;

    @Prop({ required: true, default: 0 })
    responseNote: string;
}

export const RankSchema = SchemaFactory.createForClass(Rank);