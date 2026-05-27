import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IdeaStatus = 'pendiente' | 'en_desarrollo' | 'desarrollada';
export type IdeaPriority = 'alta' | 'media' | 'baja';

class HistorialEntry {
  @Prop({ required: true })
  fecha: string;

  @Prop({ required: true })
  accion: string;

  @Prop()
  detalle: string;
}

class FechasIdea {
  @Prop({ required: true })
  creacion: string;

  @Prop({ required: true })
  modificacion: string;

  @Prop()
  desarrollo_inicio: string;

  @Prop()
  desarrollo_fin: string;
}

class RequerimientoInfo {
  @Prop()
  spec_path: string;

  @Prop()
  plan_path: string;

  @Prop()
  skill_usado: string;

  @Prop()
  fecha_conversion: string;

  @Prop()
  fecha_completado: string;
}

@Schema({ timestamps: true, collection: 'ideas' })
export class Idea extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  descripcion: string;

  @Prop({ default: '' })
  detalle: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ enum: ['alta', 'media', 'baja'], default: 'media' })
  prioridad: IdeaPriority;

  @Prop({ enum: ['pendiente', 'en_desarrollo', 'desarrollada'], default: 'pendiente' })
  estado: IdeaStatus;

  @Prop({ type: Object, default: null })
  requerimiento: RequerimientoInfo | null;

  @Prop({ type: Object, required: true })
  fechas: FechasIdea;

  @Prop({ type: [Object], default: [] })
  historial: HistorialEntry[];
}

export const IdeaSchema = SchemaFactory.createForClass(Idea);
