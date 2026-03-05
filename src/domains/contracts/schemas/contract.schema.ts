import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type ContractDocument = HydratedDocument<Contract>;

@Schema({ timestamps: true })
export class Contract extends Document {
    @Prop({ type: String })
    id: string;

    @Prop({ type: String, trim: true })
    name: string;

    @Prop({ type: String, trim: true })
    number: string;

    @Prop({ type: String, trim: true })
    description: string;

    @Prop({ type: Date, default: Date.now })
    issueDate: Date;

    @Prop({ type: Date, default: Date.now })
    updatedAt?: Date;

    @Prop({ type: Types.ObjectId, ref: 'Client' })
    client?: Types.ObjectId;

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

export const ContractSchema = SchemaFactory.createForClass(Contract);