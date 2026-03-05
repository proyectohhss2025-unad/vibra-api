import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type FeedbackDocument = HydratedDocument<Feedback>;

/**
 * Feedback Schema
 * @typedef {Object} Feedback
 *
 * @property {String} serial - Name of user
 * @property {String} title - Title of the feedback
 * @property {String} description - Description of the feedback
 * @property {Boolean} isFeature - is Feature
 * @property {Boolean} isSupport - is Support
 * @property {Boolean} isActive - Active status
 * @property {Boolean} deleted - Deletion status
 * @property {Date} deletedAt - Date deleted
 * @property {String} deletedBy - User who deleted
 * @property {Date} editedAt - Date edited
 * @property {String} editedBy - User edited
 * @property {Date} createdAt - Date created
 * @property {String} createdBy - User created
 * @property {String} event - Event information
 */
@Schema()
export class Feedback {
    @Prop()
    serial?: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ default: false })
    isFeature?: boolean;

    @Prop({ default: false })
    isSupport?: boolean;

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

    @Prop({ required: true })
    createdBy: string;

    @Prop()
    event?: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);