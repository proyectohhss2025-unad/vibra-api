import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/domains/users/schemas/user.schema';

@Schema()
export class Session extends Document {

    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ required: true })
    createIssue: Date;

    @Prop({ required: false })
    endIssue: Date;

    @Prop({ required: true })
    online: boolean;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    user: User;

}

export const SessionSchema = SchemaFactory.createForClass(Session);