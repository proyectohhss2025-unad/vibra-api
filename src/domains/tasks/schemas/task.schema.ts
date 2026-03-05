import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type TaskDocument = HydratedDocument<Task>;

/**
 * Task Schema
 * @typedef {Object} Task
 *
 * @property {String} name - Task name
 * @property {String} description - Task description
 * @property {String} cronExpression - Cron expression for scheduling
 * @property {String} serial - id unique
 * @property {boolean} isActive - Task active status
 * @property {boolean} deleted - Task deletion status
 * @property {Date} deletedAt - Date deleted
 * @property {String} deletedBy - User who deleted
 * @property {Date} editedAt - Date edited
 * @property {String} editedBy - User who edited
 * @property {Date} createdAt - Date created
 * @property {String} createdBy - User who created
 * @property {String} event - Event associated with task
 */
@Schema({ timestamps: true })
export class Task extends Document {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    cronExpression: string;

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
}

export const TaskSchema = SchemaFactory.createForClass(Task);