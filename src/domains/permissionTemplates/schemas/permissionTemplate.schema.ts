import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Document,
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import { Permission } from '../../permissions/schemas/permission.schema';

export type PermissionTemplateDocument = HydratedDocument<PermissionTemplate>;

@Schema({ timestamps: true })
export class PermissionTemplate extends Document {
  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Permission' }] })
  permissions: Types.ObjectId[] | Permission[];

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

export const PermissionTemplateSchema =
  SchemaFactory.createForClass(PermissionTemplate);
