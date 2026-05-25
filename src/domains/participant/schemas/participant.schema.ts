import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type ParticipantDocument = HydratedDocument<Participant>;

export const PARTICIPANT_LEVELS = ['bronce', 'plata', 'oro', 'platino', 'diamante'] as const;
export type ParticipantLevel = (typeof PARTICIPANT_LEVELS)[number];

export function calculateLevel(points: number): ParticipantLevel {
  if (points >= 1000) return 'diamante';
  if (points >= 600) return 'platino';
  if (points >= 300) return 'oro';
  if (points >= 100) return 'plata';
  return 'bronce';
}

@Schema({ timestamps: true })
export class Participant extends Document {
  // ─── Relación con User ───
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  // ─── Datos básicos del participante ───
  @Prop({ type: String, required: true, trim: true })
  nickname: string;

  @Prop({ type: String, trim: true })
  avatar?: string;

  // ─── Progreso y gamificación ───
  @Prop({ type: Number, default: 0 })
  points: number;

  @Prop({ type: String, enum: PARTICIPANT_LEVELS, default: 'bronce' })
  level: ParticipantLevel;

  @Prop({ type: Number, default: 0 })
  currentStreak: number;

  @Prop({ type: Number, default: 0 })
  maxStreak: number;

  @Prop({ type: Number, default: 0 })
  totalActivitiesCompleted: number;

  @Prop({ type: Date })
  lastActivityDate?: Date;

  // ─── Preferencias ───
  @Prop({ type: Object })
  preferences?: {
    language: string;
    notifications: boolean;
  };

  // ─── Curso actual ───
  @Prop({ type: Types.ObjectId, ref: 'Course' })
  currentCourse?: Types.ObjectId;

  // ─── Flags del sistema ───
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  // ─── Historial de sesión ───
  @Prop({ type: Date })
  lastSessionDate?: Date;

  // ─── CAMPOS LEGACY (opcionales, para compatibilidad con Contract) ───
  @Prop({ type: String, trim: true })
  name?: string;

  @Prop({ type: String, trim: true })
  nit?: string;

  @Prop({ type: String, trim: true })
  epsCode?: string;

  @Prop({ type: String, trim: true })
  address?: string;

  @Prop({ type: String, trim: true })
  phoneNumber?: string;

  @Prop({ type: String, trim: true })
  email?: string;

  @Prop({ type: Object })
  managerData?: {
    name: string;
    documentType: Types.ObjectId;
    document: string;
    email: string;
    phoneNumber: string;
  };

  @Prop({ type: [String] })
  overdueInvoiceIds?: string[];

  @Prop({ type: Number })
  totalDebt?: number;

  @Prop({ type: Number })
  daysInArrears?: number;

  @Prop({ type: Number })
  creditLimit?: number;

  @Prop({ type: Object })
  walletData?: {
    probabilityOfPayment: number;
  };

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Transaction' }] })
  transactions?: Types.ObjectId[];

  @Prop({ type: Boolean })
  isParticular?: boolean;

  @Prop({ type: String })
  externalId?: string;

  @Prop({ type: String })
  regime?: string;

  @Prop({ type: String })
  serial?: string;

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

  @Prop({ type: String })
  createdBy: string;

  @Prop({ type: String })
  event?: string;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);
