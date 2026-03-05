import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true })
export class AuditLog extends Document {
    @Prop({ type: String, required: true })
    user: string;

    @Prop({ type: String, required: true })
    action: string;

    @Prop({ type: String, required: true })
    entity: string;

    @Prop({ type: String })
    details?: string;

    @Prop({ type: String })
    ip?: string;

    @Prop({ type: Date, default: Date.now })
    timestamp: Date;

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

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);