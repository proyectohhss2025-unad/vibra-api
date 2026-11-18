import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: String })
  ID: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: Boolean })
  isRead?: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;

  /*@Prop({ type: Types.ObjectId, ref: 'Participant' })
  participant?: Types.ObjectId;*/

  @Prop({ type: Types.ObjectId, ref: 'NotificationType' })
  notificationType: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'NotificationChannel' })
  notificationChannel: Types.ObjectId;

  @Prop({ type: Number })
  priority: number;

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

  /**
   * Acción que el cliente puede ejecutar desde la notificación
   * (p. ej. `OPEN_DAILY_ACTIVITIES`).
   */
  @Prop({ type: String })
  action?: string;

  /** Etiqueta visible del botón de acción. */
  @Prop({ type: String })
  actionLabel?: string;

  /** Metadatos para la acción (filtros, rango de fechas, etc.). */
  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Búsqueda idempotente de notificaciones de sistema por evento
// (p. ej. DAILY_COVERAGE:<fecha>). Sparse: la mayoría no tiene `event`.
NotificationSchema.index({ event: 1 }, { sparse: true });

// Bandeja por usuario: listado ordenado, no leídas y avisos dirigidos.
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index(
  { user: 1, event: 1 },
  { sparse: true },
);
