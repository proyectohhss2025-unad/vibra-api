import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type LoggerDocument = HydratedDocument<Logger>;

@Schema({ timestamps: true })
export class Logger extends Document {
    @Prop({ type: String, required: true })
    id: string;

    @Prop({ type: String, required: true })
    method: string;

    @Prop({ type: String, required: true })
    url: string;

    @Prop({ type: Number })
    status: number;

    @Prop({ type: Number })
    responseTime: number;

    @Prop({ type: Date, default: Date.now })
    timestamp: Date;

    @Prop({ type: String })
    ipAddress: string;

    @Prop({ type: String })
    userAgent: string;

    @Prop({ type: String })
    origin: string;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    @Prop({ type: Boolean, default: false })
    deleted: boolean;

    @Prop({ type: Date })
    deletedAt: Date;

    @Prop({ type: String })
    deletedBy: string;

    @Prop({ type: Date, default: Date.now })
    createdAt: Date;
}

export const LoggerSchema = SchemaFactory.createForClass(Logger);