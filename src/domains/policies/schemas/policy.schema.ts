import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PolicyType } from '../types/policy-type.enum';

export type PolicyDocument = Document & Policy;

@Schema({ timestamps: true })
export class Policy {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    content: string;

    @Prop({ required: true })
    version: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ required: true, type: String, enum: PolicyType })
    type: PolicyType;

    @Prop({ default: Date.now })
    effectiveDate: Date;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);