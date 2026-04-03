import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Role } from 'src/domains/roles/schemas/role.schema';
import { Company } from 'src/domains/company/schemas/company.schema';
import { DocumentType } from 'src/domains/documentType/schemas/documentType.model';
import { Gender } from 'src/utils/enum';


@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  documentNumber: string;

  @Prop({ required: false, type: MongooseSchema.Types.ObjectId, ref: "DocumentType" })
  documentType: Types.ObjectId | DocumentType;

  @Prop({ type: String })
  address: string;

  @Prop({ type: String })
  phoneNumber: string;

  @Prop({ type: String, unique: true })
  email: string;

  @Prop({ default: false })
  keepSessionActive: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Role',
    required: false,
    index: true,
  })
  role: Types.ObjectId | Role;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Company',
    required: false,
    index: true,
  })
  company: Types.ObjectId | Company;

  @Prop({ required: true })
  avatar: string;

  @Prop({ type: String, enum: Gender, default: Gender.MALE })
  gender: string;

  @Prop({ type: Date })
  birthDate: Date;

  @Prop({ type: Boolean, default: false })
  isLogged: boolean;

  @Prop({ default: 0 })
  totalScore: number;

  @Prop({ type: String })
  serial: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop({ type: String })
  deletedBy: string;

  @Prop({ type: Date })
  editedAt: Date;

  @Prop({ type: String })
  editedBy: string;

  @Prop({ type: String })
  createdBy: string;

  @Prop({ type: String })
  event: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
