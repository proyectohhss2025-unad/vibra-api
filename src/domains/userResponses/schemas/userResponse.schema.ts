import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsArray, IsDate, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Document, Types } from 'mongoose';
import { Activity } from '../../activities/schemas/activity.schema';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class UserResponse extends Document {
    @Prop({
        type: Types.ObjectId,
        ref: User.name,
        required: true,
        index: true
    })
    @IsNotEmpty()
    user: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: Activity.name,
        required: true,
        index: true
    })
    @IsNotEmpty()
    activity: Types.ObjectId;

    @Prop([{
        questionId: {
            type: String,
            required: true
        },
        answer: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            default: null
        },
        responseTime: {
            type: Number,
            required: true,
            min: 0
        }
    }])
    @IsArray()
    @ValidateNested({ each: true })
    responses: Array<{
        questionId: string;
        answer: string;
        isCorrect?: boolean;
        responseTime: number;
    }>;

    @Prop({
        type: Number,
        required: true,
        min: 0,
        index: true
    })
    @IsNumber()
    score: number;

    @Prop({
        type: Date,
        required: true,
        default: Date.now
    })
    @IsDate()
    startTime: Date;

    @Prop({
        type: Date,
        required: true
    })
    @IsDate()
    endTime: Date;

    // Virtual para calcular el tiempo total
    @Prop({
        virtual: true,
        get: function () {
            return this.endTime.getTime() - this.startTime.getTime();
        }
    })
    timeSpent: number;
}

export const UserResponseSchema = SchemaFactory.createForClass(UserResponse);

/*
// Índices compuestos para optimizar consultas
UserResponseSchema.index({ user: 1, activity: 1 });
UserResponseSchema.index({ createdAt: -1 });
UserResponseSchema.index({ score: -1 });

// Configuración adicional para populación automática
UserResponseSchema.pre<UserResponse>(/^find/, async function (next) {
    (await this.populate({
        path: 'user',
        select: 'username avatar'
    })).populate({
        path: 'activity',
        select: 'emotion title difficulty'
    });
    next();
});
*/