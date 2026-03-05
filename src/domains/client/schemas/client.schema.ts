import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

@Schema({ timestamps: true })
export class Client extends Document {
    @Prop({ type: String, required: true, trim: true })
    name: string;

    @Prop({ type: String, required: true, trim: true })
    nit: string;

    @Prop({ type: String, trim: true })
    epsCode: string;

    @Prop({ type: String, trim: true })
    address: string;

    @Prop({ type: String, trim: true })
    phoneNumber: string;

    @Prop({ type: String, trim: true })
    email: string;

    @Prop({ type: Object })
    managerData?: {
        name: string;
        documentType: Types.ObjectId;
        document: string;
        email: string;
        phoneNumber: string;
    };

    @Prop({ type: [String] })
    overdueInvoiceIds: string[];

    @Prop({ type: Number })
    totalDebt: number;

    @Prop({ type: Number })
    daysInArrears: number;

    @Prop({ type: Number })
    creditLimit: number;

    @Prop({ type: Object })
    walletData?: {
        probabilityOfPayment: number;
    };

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Transaction' }] })
    transactions?: Types.ObjectId[];

    @Prop({ type: String })
    avatar: string;

    @Prop({ type: Boolean })
    isParticular?: boolean;

    @Prop({ type: String })
    externalId?: string;

    @Prop({ type: Date })
    updatedAt?: Date;

    @Prop({ type: String })
    regime?: string;

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

export const ClientSchema = SchemaFactory.createForClass(Client);