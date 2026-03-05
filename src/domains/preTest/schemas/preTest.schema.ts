import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type TestDocument = HydratedDocument<PreTest>;

@Schema()
export class PreTest {
    @Prop({ required: true })
    testId: string;

    @Prop({ required: true })
    userId: string;

    @Prop({ type: Array, required: true })
    responses: { questionId: string; answer: any; points: number }[];

    @Prop()
    totalScore?: number;
}

export const PreTestSchema = SchemaFactory.createForClass(PreTest);