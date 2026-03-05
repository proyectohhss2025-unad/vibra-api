import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { PermissionCategory } from '../../../domains/permissionCategory/schemas/permissionCategory.schema';
import { UserPermission } from 'src/domains/userPermissions/schemas/userPermission.schema';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({ timestamps: true })
export class Permission extends Document {
    @Prop({ type: String })
    name: string;

    @Prop({ type: String })
    description: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'PermissionCategory' })
    permissionCategory?: Types.ObjectId | PermissionCategory;

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'UserPermission' }] })
    usersPermission?: UserPermission[];

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

export const PermissionSchema = SchemaFactory.createForClass(Permission);