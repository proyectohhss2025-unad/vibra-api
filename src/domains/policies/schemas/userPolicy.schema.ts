import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Policy } from './policy.schema';

export type UserPolicyDocument = Document & UserPolicy;

@Schema({ timestamps: true })
export class UserPolicy {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: User;

    @Prop({ type: Types.ObjectId, ref: 'Policy', required: true })
    policyId: Policy;

    @Prop({ unique: true, required: true })
    userPolicyKey: string;

    @Prop({ required: true })
    version: string;

    @Prop({ required: true, default: Date.now })
    acceptedAt: Date;

    @Prop({ default: true })
    isAccepted: boolean;

    @Prop()
    ipAddress?: string;

    @Prop()
    userAgent?: string;
}

export const UserPolicySchema = SchemaFactory.createForClass(UserPolicy);