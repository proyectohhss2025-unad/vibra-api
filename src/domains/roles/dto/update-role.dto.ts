import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateRoleDto } from './create-role.dto';

/**
 * DTO para la actualización de un rol
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {
    /**
     * ID del rol a actualizar
     */
    @IsString()
    _id: string;

    /**
     * Usuario que edita el rol
     */
    @IsString()
    @IsOptional()
    editedBy?: string;
}