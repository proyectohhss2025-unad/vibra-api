import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

// ─── Sub-schema: RelapseEntry ───────────────────────────────────────────
export class RelapseEntry {
  @Prop({ required: true })
  blockedAt: Date;

  @Prop({ default: null })
  releasedAt: Date | null;

  @Prop({ default: 0 })
  attemptCount: number;
}

export const RelapseEntrySchema = SchemaFactory.createForClass(RelapseEntry);

// ─── Main schema: BlockedIp ─────────────────────────────────────────────
@Schema({ timestamps: true })
export class BlockedIp extends Document {
  @Prop({ required: true, unique: true, index: true })
  ip: string;

  @Prop({ default: 0 })
  attemptCount: number;

  @Prop({ required: true })
  blockedAt: Date;

  @Prop({ default: null })
  releasedAt: Date | null;

  @Prop({ default: null })
  releasedBy: string | null;

  @Prop({ default: 0 })
  relapseCount: number;

  @Prop({ default: 'auto', enum: ['auto', 'manual'] })
  blockedBy: string;

  @Prop({ type: [RelapseEntrySchema], default: [] })
  relapseHistory: RelapseEntry[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  metadata: Record<string, any> | null;
}

export const BlockedIpSchema = SchemaFactory.createForClass(BlockedIp);
