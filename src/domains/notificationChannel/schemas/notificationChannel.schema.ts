import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type NotificationChannelDocument = HydratedDocument<NotificationChannel>;

@Schema({ timestamps: true })
export class NotificationChannel extends Document {
    @Prop({ type: String })
    title: string;

    @Prop({ type: String })
    description?: string;

    @Prop({ type: Number })
    level?: number;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Notification' }] })
    notifications?: Types.ObjectId[];

    @Prop({ type: String })
    serial?: string;

    @Prop({ type: Boolean, default: true })
    isActive?: boolean;

    @Prop({ type: Boolean, default: false })
    deleted?: boolean;

    @Prop({ type: Date })
    deletedAt?: Date;

    @Prop({ type: String })
    deletedBy?: string;

    @Prop({ type: Date })
    editedAt?: Date;

    @Prop({ type: String })
    editedBy?: string;

    @Prop({ type: Date, default: Date.now })
    createdAt: Date;

    @Prop({ type: String })
    createdBy: string;

    @Prop({ type: String })
    event?: string;
}

export const NotificationChannelSchema = SchemaFactory.createForClass(NotificationChannel);