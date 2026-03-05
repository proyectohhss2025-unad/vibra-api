import { IsMongoId, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateUserPermissionDto {
    @IsOptional()
    @IsMongoId()
    user?: Types.ObjectId;

    @IsOptional()
    @IsMongoId()
    permission?: Types.ObjectId;

    @IsOptional()
    @IsString()
    serial?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    editedBy?: string;
}