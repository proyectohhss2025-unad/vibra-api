import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ timestamps: true })
export class Company extends Document {
    @Prop({ type: String })
    name: string;

    @Prop({ type: String })
    slogan: string;

    @Prop({ type: String })
    nit: string;

    @Prop({ type: String })
    address: string;

    @Prop({ type: String })
    email: string;

    @Prop({ type: Number })
    phoneNumber: number;

    @Prop({ type: Object })
    managerData: {
        name: string;
        documentType: Types.ObjectId;
        document: string;
        email: string;
        phoneNumber: string;
    };

    @Prop({ type: Types.ObjectId, ref: 'User' })
    userAdmin: Types.ObjectId;

    @Prop({ type: Object })
    modules: {
        billing: {
            seriesCurrentBillingRange: string;
        }
    };

    @Prop({ type: Boolean })
    isMain?: boolean;

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

export const CompanySchema = SchemaFactory.createForClass(Company);