import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from 'src/domains/users/schemas/user.schema';
import { Company } from 'src/domains/company/schemas/company.schema';

export type UserSessionDocument = Document & UserSession;

/**
 * User Session Schema
 * @typedef {Object} UserSession
 * @property {User} user - Usuario del sistema quien inicia sistema
 * @property {Company} company - compañia
 * @property {Date} initTime - tiempo inicial
 * @property {Date} endTime - tiempo final
 * @property {String} ip - ip desde donde se realiza la conexión
 * @property {Boolean} isLogged - se encuentra loggeado
 */
@Schema()
export class UserSession extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company' })
  company: Types.ObjectId | Company;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: Types.ObjectId | User;

  @Prop({ required: true })
  initTime: Date;

  @Prop()
  endTime: Date;

  @Prop()
  ip: string;

  @Prop({ default: false })
  isLogged: boolean;

  @Prop()
  serial?: string;

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ default: false })
  deleted?: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  deletedBy?: string;

  @Prop()
  editedAt?: Date;

  @Prop()
  editedBy?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  createdBy: string;

  @Prop()
  event?: string;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);
