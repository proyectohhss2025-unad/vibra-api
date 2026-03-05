import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MongoDBAdminDocument = MongoDBAdmin & Document;

@Schema()
export class MongoDBAdmin {
    @Prop({ required: true })
    originDatabaseName: string;

    @Prop({ required: true })
    destinationDatabaseName: string;

    @Prop({ default: Date.now })
    createdAt: Date;
}

export const MongoDBAdminSchema = SchemaFactory.createForClass(MongoDBAdmin);