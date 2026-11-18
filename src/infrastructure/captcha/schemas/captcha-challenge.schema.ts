import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CaptchaKind } from '../captcha.constants';

export type CaptchaChallengeDocument = HydratedDocument<CaptchaChallenge>;

/**
 * Reto de captcha de un solo uso.
 *
 * - `answerHash`: HMAC-SHA256 de `challengeId + respuesta`. Con `select: false`
 *   para que no viaje en consultas accidentales.
 * - `expiresAt`: fecha con índice TTL; Mongo elimina el documento al expirar.
 * - `consumedAt`: marca de uso. Evita reutilizar un reto resuelto.
 * - `ipHash`: IP hasheada (nunca en claro) para trazabilidad/forense.
 */
@Schema({ collection: 'captcha_challenges', timestamps: true })
export class CaptchaChallenge {
  @Prop({ required: true, unique: true, index: true })
  challengeId: string;

  @Prop({ required: true, select: false })
  answerHash: string;

  @Prop({ required: true, enum: ['sum', 'sub', 'mul'] })
  kind: CaptchaKind;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true })
  issuedAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ type: Date, default: null })
  consumedAt: Date | null;

  @Prop({ type: String })
  flow?: string;

  @Prop({ type: String })
  ipHash?: string;
}

export const CaptchaChallengeSchema =
  SchemaFactory.createForClass(CaptchaChallenge);

// TTL: Mongo elimina los retos vencidos (revisión aprox. cada 60 s).
CaptchaChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
