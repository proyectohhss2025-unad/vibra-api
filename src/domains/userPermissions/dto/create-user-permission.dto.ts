import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';

export class CreateUserPermissionDto {
    @IsNotEmpty()
    @IsMongoId()
    user: Types.ObjectId;

    @IsNotEmpty()
    @IsMongoId()
    permission: Types.ObjectId;

    @IsOptional()
    @IsString()
    serial?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    createdBy: string;
}