import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LoginAttemptDocument = HydratedDocument<LoginAttempt>;

/**
 * Contador de intentos fallidos de login por usuario.
 *
 * Persistido en MongoDB (y no en memoria) para que el bloqueo funcione entre
 * instancias y sobreviva a reinicios. `expiresAt` tiene índice TTL: el registro
 * se elimina solo cuando la ventana y el bloqueo ya expiraron.
 */
@Schema({ collection: 'login_attempts', timestamps: true })
export class LoginAttempt {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ default: 0 })
  failures: number;

  @Prop({ type: Date, default: null })
  firstFailureAt: Date | null;

  @Prop({ type: Date, default: null })
  lastFailureAt: Date | null;

  @Prop({ type: Date, default: null })
  lockedUntil: Date | null;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);

// Limpieza automática de contadores vencidos.
LoginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
