import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Admin extends Document {
    // Aquí se pueden agregar propiedades específicas si es necesario
    // para el módulo de administración
}

export const AdminSchema = SchemaFactory.createForClass(Admin);